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

/** For checkout: the vendor-set rate for each (vendor, city) pair that has one, keyed by vendor id. */
export async function getVendorDeliveryRatesForCity(
  supabase: Client,
  vendorIds: string[],
  city: string,
): Promise<Map<string, number>> {
  if (vendorIds.length === 0 || !city.trim()) return new Map();
  const { data, error } = await supabase
    .from("vendor_delivery_rates")
    .select("vendor_id, fee")
    .in("vendor_id", vendorIds)
    .ilike("city", city.trim());
  if (error) throw error;
  return new Map(data.map((r) => [r.vendor_id, r.fee]));
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
