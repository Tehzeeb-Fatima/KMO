import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type PromotionRow = Database["public"]["Tables"]["promotions"]["Row"];
type PromotionInsert = Database["public"]["Tables"]["promotions"]["Insert"];
type PromotionUpdate = Database["public"]["Tables"]["promotions"]["Update"];

export interface PromotionWithLinks extends PromotionRow {
  vendors: { store_name: string; slug: string } | null;
  categories: { name: string; slug: string } | null;
  promotion_products: { product_id: string }[];
}

const PROMOTION_SELECT =
  "*, vendors(store_name, slug), categories(name, slug), promotion_products(product_id)";

/** Live deals for the storefront: active, and inside their time window. */
export async function listActivePromotions(
  supabase: Client,
  limit = 6,
): Promise<PromotionWithLinks[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("promotions")
    .select(PROMOTION_SELECT)
    .eq("is_active", true)
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso)
    .order("sort_order")
    .order("ends_at")
    .limit(limit);
  if (error) throw error;
  return data as unknown as PromotionWithLinks[];
}

/** Every promotion, including expired and paused ones — for the admin table. */
export async function listAllPromotions(supabase: Client): Promise<PromotionWithLinks[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select(PROMOTION_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as PromotionWithLinks[];
}

export async function createPromotion(
  supabase: Client,
  input: PromotionInsert,
): Promise<PromotionRow> {
  const { data, error } = await supabase.from("promotions").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updatePromotion(
  supabase: Client,
  id: string,
  patch: PromotionUpdate,
): Promise<PromotionRow> {
  const { data, error } = await supabase
    .from("promotions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePromotion(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}

/** Replaces a promotion's product-scoping list wholesale. An empty array
 *  clears product-scoping, falling the promotion back to matching by
 *  vendor_id/category_id instead. */
export async function setPromotionProducts(
  supabase: Client,
  promotionId: string,
  productIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("promotion_products")
    .delete()
    .eq("promotion_id", promotionId);
  if (deleteError) throw deleteError;

  if (productIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("promotion_products")
    .insert(productIds.map((product_id) => ({ promotion_id: promotionId, product_id })));
  if (insertError) throw insertError;
}

/** Uploads a promotion banner to the `promotion-media` bucket. */
export async function uploadPromotionImage(supabase: Client, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("promotion-media").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("promotion-media").getPublicUrl(path);
  return data.publicUrl;
}

/* ── top categories ─────────────────────────────────────────────────────── */

export interface TopCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sold_count: number;
  product_count: number;
}

/** Categories ranked by units actually sold, for the homepage sections. */
export async function listTopCategories(supabase: Client, limit = 3): Promise<TopCategory[]> {
  const { data, error } = await supabase.rpc("top_categories", { limit_count: limit });
  if (error) throw error;
  return (data ?? []) as TopCategory[];
}
