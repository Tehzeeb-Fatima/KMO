import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type VendorDeliveryRateRow = Database["public"]["Tables"]["vendor_delivery_rates"]["Row"];
type DeliveryFeeCapRow = Database["public"]["Tables"]["delivery_fee_caps"]["Row"];

export async function listVendorDeliveryRates(
  supabase: Client,
  vendorId: string,
): Promise<VendorDeliveryRateRow[]> {
  const { data, error } = await supabase
    .from("vendor_delivery_rates")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("city");
  if (error) throw error;
  return data;
}

export async function setVendorDeliveryRate(
  supabase: Client,
  input: { vendor_id: string; city: string; fee: number },
): Promise<VendorDeliveryRateRow> {
  const { data, error } = await supabase
    .from("vendor_delivery_rates")
    .upsert(input, { onConflict: "vendor_id,city" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVendorDeliveryRate(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("vendor_delivery_rates").delete().eq("id", id);
  if (error) throw error;
}

/** For checkout: each vendor's rate for the delivery city — their exact-city
 *  rate if they set one, else their "Other cities" rate if they set that
 *  instead. Keyed by vendor id. */
export async function getVendorDeliveryRatesForCity(
  supabase: Client,
  vendorIds: string[],
  city: string,
): Promise<Map<string, number>> {
  if (vendorIds.length === 0 || !city.trim()) return new Map();
  const { data, error } = await supabase
    .from("vendor_delivery_rates")
    .select("vendor_id, city, fee")
    .in("vendor_id", vendorIds)
    .or(`city.ilike.${city.trim()},city.ilike.Other`);
  if (error) throw error;
  const exact = new Map<string, number>();
  const fallback = new Map<string, number>();
  for (const r of data) {
    if (r.city.toLowerCase() === city.trim().toLowerCase()) exact.set(r.vendor_id, r.fee);
    else fallback.set(r.vendor_id, r.fee);
  }
  return new Map([...fallback, ...exact]);
}

export async function listDeliveryFeeCaps(supabase: Client): Promise<DeliveryFeeCapRow[]> {
  const { data, error } = await supabase.from("delivery_fee_caps").select("*").order("city");
  if (error) throw error;
  return data;
}

export async function setDeliveryFeeCap(
  supabase: Client,
  input: { city: string; max_fee: number },
): Promise<DeliveryFeeCapRow> {
  const { data, error } = await supabase
    .from("delivery_fee_caps")
    .upsert(input, { onConflict: "city" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeliveryFeeCap(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("delivery_fee_caps").delete().eq("id", id);
  if (error) throw error;
}
