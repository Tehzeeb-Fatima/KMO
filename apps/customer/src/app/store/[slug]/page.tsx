import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import StoreClient from "./store-client";

async function fetchSeoData(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data, error } = await supabase
    .from("vendors")
    .select("id, store_name, description, cover_url, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  // undefined = lookup failed (render anyway), null = no such store.
  if (error) return undefined;
  if (!data) return null;

  // What the store sells most, so its title matches what people search for
  // (e.g. "Hamari Mitti Pakistan – Kitchenware & Cookware").
  const { data: rows } = await supabase
    .from("products")
    .select("categories(name)")
    .eq("vendor_id", data.id)
    .eq("status", "published")
    .limit(300);
  const counts = new Map<string, number>();
  for (const r of (rows ?? []) as unknown as { categories: { name: string } | null }[]) {
    const name = r.categories?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const topCategories = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n);
  return { ...data, topCategories, productCount: rows?.length ?? 0 };
}

/** Cuts at a word boundary so search results never show half a word. */
function shorten(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await fetchSeoData(slug);

  if (!vendor) {
    return { title: "Store not found — Karachi Mart Online" };
  }

  const sells = vendor.topCategories.join(" & ");
  const title = sells
    ? `${vendor.store_name} – ${sells} Online in Karachi | Karachi Mart Online`
    : `${vendor.store_name} – Shop Online in Karachi | Karachi Mart Online`;
  const description =
    shorten(vendor.description?.replace(/\s+/g, " ").trim() ?? "", 160) ||
    `Shop ${vendor.store_name}${sells ? ` for ${sells.toLowerCase()}` : ""} online on Karachi Mart Online. Verified Karachi seller, cash on delivery.`;
  const image = vendor.cover_url || vendor.logo_url || undefined;

  return {
    title,
    description,
    // a store with nothing live yet is a thin page: keep it out of the index
    robots: vendor.productCount === 0 ? { index: false, follow: true } : undefined,
    alternates: { canonical: `/store/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://karachimartonline.com/store/${slug}`,
      images: image ? [{ url: image, alt: vendor.store_name }] : undefined,
    },
  };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await fetchSeoData(slug);
  if (vendor === null) notFound();
  return (
    <>
      {vendor ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              name: vendor.store_name,
              url: `https://karachimartonline.com/store/${slug}`,
              image: vendor.logo_url || vendor.cover_url || undefined,
              description: vendor.description || undefined,
              address: { "@type": "PostalAddress", addressLocality: "Karachi", addressCountry: "PK" },
              parentOrganization: { "@type": "Organization", name: "Karachi Mart Online", url: "https://karachimartonline.com" },
            }),
          }}
        />
      ) : null}
      <StoreClient />
    </>
  );
}
