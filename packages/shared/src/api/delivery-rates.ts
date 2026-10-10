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
  // The unique index is on (vendor_id, lower(city)), an expression — upsert's
  // onConflict can't target that, so this checks for an existing row itself.
  const { data: existingRow } = await supabase
    .from("vendor_delivery_rates")
    .select("id")
    .eq("vendor_id", input.vendor_id)
    .ilike("city", input.city)
    .maybeSingle();

  const { data, error } = existingRow
    ? await supabase
        .from("vendor_delivery_rates")
        .update({ fee: input.fee })
        .eq("id", existingRow.id)
        .select("*")
        .single()
    : await supabase.from("vendor_delivery_rates").insert(input).select("*").single();
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

/** With no vendorId: every default (platform-wide) cap. With a vendorId: that
 *  vendor's own override caps, plus the defaults (so a vendor's screen can
 *  show "capped at Rs. X" even for cities they don't have their own cap for). */
export async function listDeliveryFeeCaps(supabase: Client, vendorId?: string): Promise<DeliveryFeeCapRow[]> {
  let query = supabase.from("delivery_fee_caps").select("*").order("city");
  query = vendorId ? query.or(`vendor_id.is.null,vendor_id.eq.${vendorId}`) : query.is("vendor_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function setDeliveryFeeCap(
  supabase: Client,
  input: { vendor_id?: string | null; city: string; max_fee: number },
): Promise<DeliveryFeeCapRow> {
  const vendorId = input.vendor_id ?? null;
  let existing = supabase.from("delivery_fee_caps").select("id").eq("city", input.city);
  existing = vendorId ? existing.eq("vendor_id", vendorId) : existing.is("vendor_id", null);
  const { data: existingRow } = await existing.maybeSingle();

  const { data, error } = existingRow
    ? await supabase
        .from("delivery_fee_caps")
        .update({ max_fee: input.max_fee })
        .eq("id", existingRow.id)
        .select("*")
        .single()
    : await supabase
        .from("delivery_fee_caps")
        .insert({ vendor_id: vendorId, city: input.city, max_fee: input.max_fee })
        .select("*")
        .single();
  if (error) throw error;
  return data;
}

export async function deleteDeliveryFeeCap(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("delivery_fee_caps").delete().eq("id", id);
  if (error) throw error;
}
