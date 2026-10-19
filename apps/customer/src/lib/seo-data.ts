import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { listActivePromotions, listPublishedProducts, toPricingPromotions } from "@kmo/shared/api";
import type { ProductWithMedia } from "@kmo/shared/api";
import { cardPricing, mainImageUrl } from "@kmo/shared/lib";
import type { LandingPage } from "./seo-pages";

/** Read-only client for server-rendered pages (public data only). */
export function serverSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export const listAllCategories = cache(async (): Promise<CategoryRecord[]> => {
  const { data } = await serverSupabase().from("categories").select("id, name, slug, parent_id").order("sort_order");
  return (data ?? []) as CategoryRecord[];
});

export interface GridProduct {
  id: string;
  slug: string;
  name: string;
  vendorName?: string;
  imageUrl?: string;
  price: number;
  compareAtPrice: number | null;
  badgeText: string | null;
}

async function toGridProducts(products: ProductWithMedia[]): Promise<GridProduct[]> {
  const supabase = serverSupabase();
  const promotions = toPricingPromotions(await listActivePromotions(supabase, 100).catch(() => []));
  return products.map((p) => {
    const cp = cardPricing(
      { id: p.id, vendorId: p.vendor_id, categoryId: p.category_id, price: p.price, compareAtPrice: p.compare_at_price },
      promotions,
    );
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      vendorName: p.vendors?.store_name,
      imageUrl: mainImageUrl(p.product_images),
      price: cp.price,
      compareAtPrice: cp.compareAtPrice ?? null,
      badgeText: cp.badgeText ?? null,
    };
  });
}

export async function categoryProducts(categoryId: string): Promise<GridProduct[]> {
  const products = await listPublishedProducts(serverSupabase(), { categoryId, limit: 60 }).catch(() => []);
  return toGridProducts(products);
}

export async function landingProducts(page: LandingPage): Promise<GridProduct[]> {
  const supabase = serverSupabase();
  const categories = await listAllCategories();
  const found = new Map<string, ProductWithMedia>();
  const add = (list: ProductWithMedia[]) => list.forEach((p) => found.set(p.id, p));

  for (const slug of page.categorySlugs ?? []) {
    const cat = categories.find((c) => c.slug === slug);
    if (cat) add(await listPublishedProducts(supabase, { categoryId: cat.id, limit: 60 }).catch(() => []));
  }
  for (const term of page.nameTerms ?? []) {
    add(await listPublishedProducts(supabase, { nameContains: term, limit: 60 }).catch(() => []));
  }
  for (const vendorSlug of page.vendorSlugs ?? []) {
    const { data: vendor } = await supabase.from("vendors").select("id").eq("slug", vendorSlug).maybeSingle();
    if (vendor) add(await listPublishedProducts(supabase, { vendorId: vendor.id, limit: 60 }).catch(() => []));
  }
  return toGridProducts([...found.values()].slice(0, 60));
}
