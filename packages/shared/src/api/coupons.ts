import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];
type CouponInsert = Database["public"]["Tables"]["coupons"]["Insert"];

export async function listVendorCoupons(
  supabase: Client,
  vendorId: string,
): Promise<CouponRow[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCoupon(
  supabase: Client,
  input: CouponInsert,
): Promise<CouponRow> {
  const { data, error } = await supabase
    .from("coupons")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getCouponByCode(
  supabase: Client,
  vendorId: string,
  code: string,
): Promise<CouponRow | null> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Looks up an active, unexpired coupon by code regardless of vendor — used
 * to preview a coupon at checkout before the vendor it belongs to is known
 * client-side. RLS only exposes active/unexpired coupons for this query. */
export async function previewCoupon(
  supabase: Client,
  code: string,
): Promise<(CouponRow & { vendors: { store_name: string } | null }) | null> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*, vendors(store_name)")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (CouponRow & { vendors: { store_name: string } | null }) | null;
}
