import { cache, Suspense } from "react";
import type { Metadata } from "next";
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
    return null;
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

  const title = product.seo_title || `${product.name} — Karachi Mart Online`;
  const description =
    product.seo_description || product.description?.slice(0, 160) || undefined;
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

  // The client component already emits the Product structured data; with the
  // product passed in, it now renders (data included) in the server HTML.
  // Suspense: the client reads ?colour= with useSearchParams.
  return (
    <Suspense>
      <ProductDetailClient initialProduct={product ?? undefined} />
    </Suspense>
  );
}
