// Supabase Edge Function: catalog-daily-check
//
// Runs every morning (pg_cron, see migration 20261020020000_catalog_daily_check.sql).
// Checks every live and pending product's category and its colour/size options.
//
// It fixes these on its own (safe, formatting only):
//   - several sizes typed as one option ("S.M.L.XL") → one option per size
//   - option names and values in the house style (Title Case, no emoji, "Colour"/"Size")
//   - product names in the house style
// It only reports these, for a person to decide:
//   - missing category, a main category instead of a sub-category, or a category
//     that doesn't match the product name
//   - the same colour/size listed twice, "random colour" options
//   - clothing and footwear without sizes
//   - colours without their own photo
//
// The report is emailed (DIGEST_TO, default tehzeeb.pirani@gmail.com) and posted
// to the admin notification bell. Nothing is sent when everything is fine.
//
// Secrets: DIGEST_SECRET (x-digest-secret header from the cron job), KMO_SMTP_PASSWORD,
// optional KMO_SMTP_USER/HOST/PORT, DIGEST_TO.
// Deploy with: npx supabase functions deploy catalog-daily-check --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";
import { suggestCategories } from "../../../packages/shared/src/lib/category-suggest.ts";
import { formatProductTitle } from "../../../packages/shared/src/lib/product-title.ts";
import { splitSizes } from "../../../packages/shared/src/lib/variant-options.ts";

const ADMIN_URL = "https://admin.karachimartonline.com/products";
const SEP = " / ";

type Cat = { id: string; name: string; slug: string; parent_id: string | null };
type Variant = {
  id: string;
  product_id: string;
  option_name: string;
  option_value: string;
  price_override: number | null;
  stock_quantity: number | null;
};
type Product = {
  id: string;
  name: string;
  status: string;
  category_id: string | null;
  category_reviewed_id: string | null;
  vendors: { store_name: string } | null;
  product_variants: Variant[];
  product_images: { variant_id: string | null }[];
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function normaliseOptionName(name: string): string {
  return name
    .split(SEP)
    .map((part) => {
      const p = part.trim().toLowerCase();
      if (p === "color" || p === "colour" || p === "colors" || p === "colours") return "Colour";
      if (p === "size" || p === "sizes") return "Size";
      return formatProductTitle(part);
    })
    .join(SEP);
}

function path(cats: Cat[], id: string | null): string {
  const c = cats.find((x) => x.id === id);
  if (!c) return "—";
  const parent = c.parent_id ? cats.find((x) => x.id === c.parent_id) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

const FASHION = /^(womens-fashion|mens-fashion|kids-fashion)-/;
const NO_SIZE_NEEDED = /(handbags|accessories|wallets|unstitched|shawls|abaya|innerwear-socks)/;

Deno.serve(async (req) => {
  const secret = Deno.env.get("DIGEST_SECRET");
  if (!secret || req.headers.get("x-digest-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: cats, error: catError } = await db.from("categories").select("id, name, slug, parent_id");
  if (catError) return new Response(catError.message, { status: 500 });
  const { data: rows, error } = await db
    .from("products")
    .select("id, name, description, status, category_id, category_reviewed_id, vendors(store_name), product_variants(*), product_images(variant_id)")
    .in("status", ["published", "pending"])
    .limit(5000);
  if (error) return new Response(error.message, { status: 500 });
  const products = rows as unknown as Product[];
  const categories = cats as Cat[];
  const parents = new Set(categories.filter((c) => c.parent_id).map((c) => c.parent_id));

  const fixed: string[] = [];
  const issues: { vendor: string; product: string; problem: string }[] = [];
  const report = (p: Product, problem: string) =>
    issues.push({ vendor: p.vendors?.store_name ?? "Unknown vendor", product: p.name, problem });

  for (const p of products) {
    // ── name ──
    const tidyName = formatProductTitle(p.name);
    if (tidyName && tidyName !== p.name) {
      await db.from("products").update({ name: tidyName }).eq("id", p.id);
      fixed.push(`Name: "${p.name}" → "${tidyName}"`);
      p.name = tidyName;
    }

    // ── category ──
    const cat = categories.find((c) => c.id === p.category_id);
    if (!cat) {
      report(p, "No category");
    } else if (parents.has(cat.id)) {
      report(p, `In main category "${cat.name}" — needs a sub-category`);
    } else if (p.category_reviewed_id !== cat.id) {
      // Skipped once someone confirmed this category in admin.
      const suggested = suggestCategories(p.name, categories, 3, 5);
      if (suggested.length > 0 && !suggested.some((c) => c.id === cat.id)) {
        report(p, `Category may be wrong: now ${path(categories, cat.id)}, looks like ${path(categories, suggested[0].id)}`);
      }
    }

    // ── options (colours / sizes) ──
    const seen = new Set<string>();
    for (const v of p.product_variants) {
      const name = normaliseOptionName(v.option_name);
      const names = name.split(SEP);
      const values = v.option_value.split(SEP).map((x) => formatProductTitle(x));
      const sizeIndex = names.indexOf("Size");
      const sizes = sizeIndex >= 0 ? splitSizes(values[sizeIndex]) : [values[sizeIndex]];

      if (sizeIndex >= 0 && sizes.length > 1) {
        // "S.M.L" → the original row becomes "S", new rows for the rest.
        const make = (size: string) => values.map((x, i) => (i === sizeIndex ? size : x)).join(SEP);
        const newRows = sizes
          .slice(1)
          .filter((size) => !p.product_variants.some((o) => o.option_value === make(size)))
          .map((size) => ({
            product_id: p.id,
            option_name: name,
            option_value: make(size),
            price_override: v.price_override,
            stock_quantity: v.stock_quantity,
          }));
        await db.from("product_variants").update({ option_name: name, option_value: make(sizes[0]) }).eq("id", v.id);
        if (newRows.length) await db.from("product_variants").insert(newRows);
        fixed.push(`Sizes split: ${p.name} — "${v.option_value}" → ${sizes.join(", ")}`);
        sizes.forEach((s) => seen.add(make(s).toLowerCase()));
        continue;
      }

      const value = values.join(SEP);
      if (name !== v.option_name || value !== v.option_value) {
        await db.from("product_variants").update({ option_name: name, option_value: value }).eq("id", v.id);
        fixed.push(`Option tidied: ${p.name} — "${v.option_value}" → "${value}"`);
      }
      const key = `${name}|${value}`.toLowerCase();
      if (seen.has(key)) report(p, `"${value}" is listed twice`);
      seen.add(key);
      if (/random|assorted|mix(ed)? colou?r/i.test(value)) report(p, `Option "${value}" — ask the vendor for the real colours`);
    }

    // Clothing and footwear need sizes.
    // Unstitched cloth is sold by the set, so it has no sizes
    const unstitched = /un-?stitched/i.test(`${p.name} ${p.description ?? ""}`);
    if (cat && FASHION.test(cat.slug) && !NO_SIZE_NEEDED.test(cat.slug) && !unstitched) {
      const hasSize = p.product_variants.some((v) => normaliseOptionName(v.option_name).split(SEP).includes("Size"));
      if (!hasSize) report(p, "Clothing/footwear without sizes");
    }

    // Each colour should have its own photo when the product has several colours.
    const colourIdx = (v: Variant) => normaliseOptionName(v.option_name).split(SEP).indexOf("Colour");
    const colourVariants = p.product_variants.filter((v) => colourIdx(v) >= 0);
    const colours = new Map<string, string[]>();
    for (const v of colourVariants) {
      const c = v.option_value.split(SEP)[colourIdx(v)];
      colours.set(c, [...(colours.get(c) ?? []), v.id]);
    }
    if (colours.size > 1) {
      const withPhoto = new Set(p.product_images.map((i) => i.variant_id).filter(Boolean));
      const missing = [...colours.entries()].filter(([, ids]) => !ids.some((id) => withPhoto.has(id))).map(([c]) => c);
      if (missing.length) report(p, `No photo for colour: ${missing.join(", ")}`);
    }
  }

  if (fixed.length === 0 && issues.length === 0) return Response.json({ sent: false, checked: products.length });

  // ── report ──
  const byVendor = new Map<string, typeof issues>();
  for (const i of issues) byVendor.set(i.vendor, [...(byVendor.get(i.vendor) ?? []), i]);
  const sections = [...byVendor.entries()]
    .map(
      ([vendor, list]) =>
        `<h3 style="margin:18px 0 6px;color:#4a2266">${esc(vendor)} (${list.length})</h3><table style="border-collapse:collapse;width:100%;font-size:13px">${list
          .map(
            (i) =>
              `<tr><td style="padding:6px 8px;border-bottom:1px solid #eadfda;font-weight:bold">${esc(i.product)}</td><td style="padding:6px 8px;border-bottom:1px solid #eadfda">${esc(i.problem)}</td></tr>`,
          )
          .join("")}</table>`,
    )
    .join("");
  const fixedList = fixed.length
    ? `<h3 style="margin:22px 0 6px;color:#2e7a4f">Fixed automatically (${fixed.length})</h3><ul style="font-size:13px;color:#4f4558;padding-left:18px">${fixed
        .slice(0, 100)
        .map((f) => `<li>${esc(f)}</li>`)
        .join("")}</ul>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#241b2b;max-width:680px">
<h2 style="color:#4a2266;margin:0 0 4px">Daily catalogue check</h2>
<p style="margin:0 0 12px;color:#6e6478">${products.length} products checked · ${issues.length} need a look · ${fixed.length} fixed automatically.</p>
<p><a href="${ADMIN_URL}" style="background:#4a2266;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open products in admin</a></p>
${sections}${fixedList}
<p style="margin-top:20px;font-size:12px;color:#9c8c7e">Sent every morning. Nothing is sent on days with no issues.</p></div>`;

  await db.from("notifications").insert({
    recipient_role: "admin",
    type: "catalog_check",
    title: `Daily catalogue check: ${issues.length} to review, ${fixed.length} fixed`,
    body: issues.slice(0, 3).map((i) => `${i.product}: ${i.problem}`).join(" · ") || null,
    link: "/products",
  });

  if (issues.length > 0) {
    const user = Deno.env.get("KMO_SMTP_USER") ?? "info@karachimartonline.com";
    const port = Number(Deno.env.get("KMO_SMTP_PORT") ?? "465");
    const transport = nodemailer.createTransport({
      host: Deno.env.get("KMO_SMTP_HOST") ?? "smtp.hostinger.com",
      port,
      secure: port === 465,
      auth: { user, pass: (Deno.env.get("KMO_SMTP_PASSWORD") ?? "").trim() },
    });
    const to = (Deno.env.get("DIGEST_TO") ?? "tehzeeb.pirani@gmail.com").split(",").map((s) => s.trim()).filter(Boolean);
    await transport.sendMail({
      from: `"Karachi Mart Online" <${user}>`,
      to,
      subject: `KMO daily check: ${issues.length} product${issues.length === 1 ? "" : "s"} to review`,
      html,
    });
  }

  return Response.json({ sent: issues.length > 0, checked: products.length, issues: issues.length, fixed: fixed.length });
});
