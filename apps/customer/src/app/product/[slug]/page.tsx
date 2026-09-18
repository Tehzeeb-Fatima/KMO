import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ProductDetailClient from "./product-detail-client";

async function fetchSeoData(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data } = await supabase
    .from("products")
    .select("name, description, seo_title, seo_description")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchSeoData(slug);

  if (!product) {
    return { title: "Product not found — Karachi Mart Online" };
  }

  const title = product.seo_title || `${product.name} — Karachi Mart Online`;
  const description =
    product.seo_description || product.description?.slice(0, 160) || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: { title, description },
  };
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}
