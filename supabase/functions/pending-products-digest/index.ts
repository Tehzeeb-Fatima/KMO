// Supabase Edge Function: pending-products-digest
//
// Emails the list of products waiting for approval. pg_cron calls it every
// 3 hours (see migration 20261017020000_pending_products_digest.sql); nothing
// is sent when the queue is empty.
//
// Secrets: DIGEST_SECRET (must match the x-digest-secret header the cron job
// sends), KMO_SMTP_PASSWORD, optional KMO_SMTP_USER/HOST/PORT and
// DIGEST_TO (default tehzeeb.pirani@gmail.com, comma-separated for several).
//
// Deploy with: npx supabase functions deploy pending-products-digest --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const ADMIN_URL = "https://admin.karachimartonline.com/products";

function mailer() {
  const user = Deno.env.get("KMO_SMTP_USER") ?? "info@karachimartonline.com";
  const port = Number(Deno.env.get("KMO_SMTP_PORT") ?? "465");
  const transport = nodemailer.createTransport({
    host: Deno.env.get("KMO_SMTP_HOST") ?? "smtp.hostinger.com",
    port,
    secure: port === 465,
    auth: { user, pass: (Deno.env.get("KMO_SMTP_PASSWORD") ?? "").trim() },
  });
  return { transport, from: `"Karachi Mart Online" <${user}>` };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

Deno.serve(async (req) => {
  const secret = Deno.env.get("DIGEST_SECRET");
  if (!secret || req.headers.get("x-digest-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: rows, error } = await db
    .from("products")
    .select("name, price, created_at, vendors(store_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return new Response(error.message, { status: 500 });
  const { data: vrows } = await db
    .from("vendors")
    .select("store_name, phone, area, created_at")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false });
  const pendingVendors = vrows ?? [];
  if (!rows?.length && !pendingVendors.length) return Response.json({ sent: false, pending: 0 });

  const since = Date.now() - 3 * 60 * 60 * 1000;
  const fresh = (rows ?? []).filter((r) => new Date(r.created_at).getTime() >= since).length;
  const byVendor = new Map<string, typeof rows>();
  for (const r of rows ?? []) {
    const v = (r.vendors as { store_name?: string } | null)?.store_name ?? "Unknown vendor";
    byVendor.set(v, [...(byVendor.get(v) ?? []), r]);
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const sections = [...byVendor.entries()]
    .map(([vendor, list]) => {
      const items = list
        .map((r) => {
          const isNew = new Date(r.created_at).getTime() >= since;
          return `<tr><td style="padding:6px 8px;border-bottom:1px solid #eadfda">${isNew ? '<b style="color:#c4552f">NEW</b> ' : ""}${esc(r.name)}</td><td style="padding:6px 8px;border-bottom:1px solid #eadfda;white-space:nowrap">Rs. ${Number(r.price).toLocaleString("en-PK")}</td><td style="padding:6px 8px;border-bottom:1px solid #eadfda;white-space:nowrap;color:#6e6478">${fmt(r.created_at)}</td></tr>`;
        })
        .join("");
      return `<h3 style="margin:18px 0 6px;color:#4a2266">${esc(vendor)} (${list.length})</h3><table style="border-collapse:collapse;width:100%;font-size:14px">${items}</table>`;
    })
    .join("");

  const vendorSection = pendingVendors.length
    ? `<h2 style="color:#c4552f;margin:0 0 6px">${pendingVendors.length} vendor${pendingVendors.length === 1 ? "" : "s"} waiting for approval</h2><p><a href="https://admin.karachimartonline.com/vendors" style="background:#c4552f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Review vendors</a></p><table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:24px">${pendingVendors
        .map((v) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eadfda"><b>${esc(v.store_name)}</b></td><td style="padding:6px 8px;border-bottom:1px solid #eadfda">${esc(v.phone ?? "")}</td><td style="padding:6px 8px;border-bottom:1px solid #eadfda;color:#6e6478">${esc(v.area ?? "")} · ${fmt(v.created_at)}</td></tr>`)
        .join("")}</table>`
    : "";
  const productCount = (rows ?? []).length;
  const html = `<div style="font-family:Arial,sans-serif;color:#241b2b;max-width:640px">
${vendorSection}${productCount ? `
<h2 style="color:#4a2266;margin:0 0 4px">${productCount} product${productCount === 1 ? "" : "s"} waiting for approval</h2>
<p style="margin:0 0 12px;color:#6e6478">${fresh} new in the last 3 hours.</p>
<p><a href="${ADMIN_URL}" style="background:#4a2266;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Review in admin</a></p>
${sections}` : ""}
<p style="margin-top:20px;font-size:12px;color:#9c8c7e">Sent every 3 hours while approvals are pending.</p></div>`;

  const to = (Deno.env.get("DIGEST_TO") ?? "tehzeeb.pirani@gmail.com").split(",").map((s) => s.trim()).filter(Boolean);
  const { transport, from } = mailer();
  await transport.sendMail({
    from,
    to,
    subject: [
      pendingVendors.length ? `${pendingVendors.length} vendor${pendingVendors.length === 1 ? "" : "s"}` : "",
      productCount ? `${productCount} product${productCount === 1 ? "" : "s"}` : "",
    ].filter(Boolean).join(" + ").replace(/^/, "KMO: ") + ` pending approval${fresh ? ` (${fresh} new)` : ""}`,
    html,
  });
  return Response.json({ sent: true, pending: productCount, vendors: pendingVendors.length, fresh });
});
