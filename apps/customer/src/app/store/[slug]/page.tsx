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
    .select("store_name, description, cover_url, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  // undefined = lookup failed (render anyway), null = no such store.
  return error ? undefined : data;
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

  const title = `${vendor.store_name} – Shop Online in Karachi | Karachi Mart Online`;
  const description =
    shorten(vendor.description?.replace(/\s+/g, " ").trim() ?? "", 160) ||
    `Shop ${vendor.store_name} online on Karachi Mart Online. Verified Karachi seller, cash on delivery.`;
  const image = vendor.cover_url || vendor.logo_url || undefined;

  return {
    title,
    description,
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
  if ((await fetchSeoData(slug)) === null) notFound();
  return <StoreClient />;
}
