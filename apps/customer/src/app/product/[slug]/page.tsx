import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getProductBySlug } from "@kmo/shared/api";
import { mainImageUrl } from "@kmo/shared/lib";
import ProductDetailClient from "./product-detail-client";

const SITE_URL = "https://karachimartonline.com";

/** One fetch per request, shared by the metadata and the page. */
const fetchProduct = cache(async (slug: string) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  try {
    return await getProductBySlug(supabase, slug);
  } catch {
    // A failed lookup is not a missing product: let the client retry.
    return undefined;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) {
    return { title: "Product not found — Karachi Mart Online" };
  }

  const price = `Rs. ${product.price.toLocaleString("en-PK")}`;
  const title = product.seo_title || `${product.name} – ${price} | Buy Online in Karachi`;
  // Short, English and complete: the start of the vendor's description, then
  // the price and cash on delivery, which is what shoppers compare in results.
  const summary = (product.description ?? "").replace(/\s+/g, " ").trim();
  const lead = summary.length > 110 ? `${summary.slice(0, 107).replace(/\s+\S*$/, "")}…` : summary;
  const description =
    product.seo_description ||
    `${lead ? `${lead} ` : ""}${price}${product.vendors ? ` from ${product.vendors.store_name}` : ""}. Cash on delivery in Karachi.`;
  const image = mainImageUrl(product.product_images);

  return {
    title,
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/product/${slug}`,
      siteName: "Karachi Mart Online",
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  // A real 404 for unknown slugs (old WooCommerce links), not a 200 "soft 404".
  if (product === null) notFound();

  // The client component already emits the Product structured data; with the
  // product passed in, it now renders (data included) in the server HTML.
  // Suspense: the client reads ?colour= with useSearchParams.
  return (
    <Suspense>
      <ProductDetailClient initialProduct={product ?? undefined} />
    </Suspense>
  );
}
