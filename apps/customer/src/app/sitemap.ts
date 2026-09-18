import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://karachimart.online";

const STATIC_PAGES = [
  "",
  "/search",
  "/about",
  "/faqs",
  "/contact",
  "/terms",
  "/privacy",
  "/shipping-policy",
  "/return-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const [{ data: products }, { data: vendors }] = await Promise.all([
    supabase.from("products").select("slug").eq("status", "published").limit(5000),
    supabase.from("vendors").select("slug").eq("verification_status", "approved").limit(5000),
  ]);

  return [
    ...STATIC_PAGES.map((path) => ({
      url: `${BASE_URL}${path}`,
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.6,
    })),
    ...(products ?? []).map((p) => ({
      url: `${BASE_URL}/product/${p.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...(vendors ?? []).map((v) => ({
      url: `${BASE_URL}/store/${v.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
