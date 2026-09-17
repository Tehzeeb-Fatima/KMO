import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];

export interface ReviewWithCustomer extends ReviewRow {
  profiles: { full_name: string | null } | null;
}

export async function listProductReviews(
  supabase: Client,
  productId: string,
): Promise<ReviewWithCustomer[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(full_name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as ReviewWithCustomer[];
}

export async function createReview(
  supabase: Client,
  input: ReviewInsert,
): Promise<ReviewRow> {
  const { data, error } = await supabase
    .from("reviews")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export interface VendorReviewRow extends ReviewRow {
  profiles: { full_name: string | null } | null;
  products: { name: string; vendor_id: string };
}

/** Reviews across every product owned by this vendor, for the Reviews inbox. */
export async function listVendorReviews(
  supabase: Client,
  vendorId: string,
): Promise<VendorReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(full_name), products!inner(name, vendor_id)")
    .eq("products.vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as VendorReviewRow[];
}

export async function replyToReview(
  supabase: Client,
  reviewId: string,
  reply: string,
): Promise<ReviewRow> {
  const { data, error } = await supabase
    .from("reviews")
    .update({ vendor_reply: reply, vendor_reply_at: new Date().toISOString() })
    .eq("id", reviewId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export interface FlaggedReviewRow extends ReviewRow {
  profiles: { full_name: string | null } | null;
  products: { name: string };
}

export async function listFlaggedReviews(supabase: Client): Promise<FlaggedReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(full_name), products(name)")
    .eq("is_flagged", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as FlaggedReviewRow[];
}

/** Admin "Keep" — un-flags the review. */
export async function keepReview(supabase: Client, reviewId: string): Promise<void> {
  const { error } = await supabase.from("reviews").update({ is_flagged: false }).eq("id", reviewId);
  if (error) throw error;
}

/** Admin "Remove" — deletes the review outright. */
export async function removeReview(supabase: Client, reviewId: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}

export interface SiteRatingSummary {
  average: number;
  count: number;
  /** Index 0 = 5-star count ... index 4 = 1-star count. */
  bars: { stars: number; pct: number }[];
}

/** Aggregate rating summary across every (non-flagged) review on the platform,
 * for the homepage "Ratings & reviews" section. */
export async function getSiteRatingSummary(supabase: Client): Promise<SiteRatingSummary> {
  const { data, error } = await supabase.from("reviews").select("rating").eq("is_flagged", false);
  if (error) throw error;

  const count = data.length;
  const average = count > 0 ? data.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  const bars = [5, 4, 3, 2, 1].map((stars) => {
    const n = data.filter((r) => r.rating === stars).length;
    return { stars, pct: count > 0 ? Math.round((n / count) * 100) : 0 };
  });

  return { average, count, bars };
}

export interface RecentReviewRow extends ReviewRow {
  profiles: { full_name: string | null } | null;
  products: { name: string } | null;
}

/** Latest reviews across every product, for the homepage summary section. */
export async function listRecentReviews(
  supabase: Client,
  limit = 3,
): Promise<RecentReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles(full_name), products(name)")
    .eq("is_flagged", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as RecentReviewRow[];
}
