import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { LANDING_PAGES } from "@/lib/seo-pages";

const BASE_URL = "https://karachimartonline.com";

const STATIC_PAGES = [
  "",
  "/vendors",
  "/about",
  "/faqs",
  "/contact",
  "/terms",
  "/privacy",
  "/shipping-policy",
  "/return-policy",
];

// Built per request: the hourly ISR copy stayed frozen at deploy time, so
// products added since then never reached Google.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  // Only live products, and only stores and categories that have them —
  // empty pages waste Google's crawl and look thin.
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("slug, created_at, category_id, vendors!inner(slug, verification_status)")
      .eq("status", "published")
      .eq("vendors.verification_status", "approved")
      .limit(5000),
    supabase.from("categories").select("id, slug, parent_id"),
  ]);

  const liveProducts = (products ?? []) as unknown as {
    slug: string;
    created_at: string;
    category_id: string | null;
    vendors: { slug: string };
  }[];
  const vendorSlugs = [...new Set(liveProducts.map((p) => p.vendors.slug))];

  const usedCategoryIds = new Set(liveProducts.map((p) => p.category_id).filter(Boolean) as string[]);
  for (const c of categories ?? []) {
    if (usedCategoryIds.has(c.id) && c.parent_id) usedCategoryIds.add(c.parent_id);
  }
  const liveCategories = (categories ?? []).filter((c) => usedCategoryIds.has(c.id));

  return [
    ...STATIC_PAGES.map((path) => ({
      url: `${BASE_URL}${path}`,
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.5,
    })),
    ...LANDING_PAGES.map((p) => ({
      url: `${BASE_URL}/${p.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...liveCategories.map((c) => ({
      url: `${BASE_URL}/category/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: c.parent_id ? 0.7 : 0.8,
    })),
    ...liveProducts.map((p) => ({
      url: `${BASE_URL}/product/${p.slug}`,
      lastModified: p.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...vendorSlugs.map((slug) => ({
      url: `${BASE_URL}/store/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
