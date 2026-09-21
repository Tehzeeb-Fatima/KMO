import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type CourierRow = Database["public"]["Tables"]["couriers"]["Row"];
type SlabRow = Database["public"]["Tables"]["courier_rate_slabs"]["Row"];
type SlabInsert = Database["public"]["Tables"]["courier_rate_slabs"]["Insert"];

export async function listCouriers(supabase: Client, activeOnly = false): Promise<CourierRow[]> {
  let query = supabase.from("couriers").select("*").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createCourier(supabase: Client, name: string): Promise<CourierRow> {
  const { data, error } = await supabase.from("couriers").insert({ name }).select("*").single();
  if (error) throw error;
  return data;
}

export async function setCourierActive(supabase: Client, id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("couriers").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteCourier(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("couriers").delete().eq("id", id);
  if (error) throw error;
}

/** vendorId omitted → the courier's platform-default slabs. Passed → that vendor's override slabs. */
export async function listCourierRateSlabs(
  supabase: Client,
  courierId: string,
  vendorId?: string | null,
): Promise<SlabRow[]> {
  let query = supabase
    .from("courier_rate_slabs")
    .select("*")
    .eq("courier_id", courierId)
    .order("city")
    .order("min_weight_kg");
  query = vendorId ? query.eq("vendor_id", vendorId) : query.is("vendor_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createCourierRateSlab(supabase: Client, input: SlabInsert): Promise<SlabRow> {
  const { data, error } = await supabase
    .from("courier_rate_slabs")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCourierRateSlab(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("courier_rate_slabs").delete().eq("id", id);
  if (error) throw error;
}
