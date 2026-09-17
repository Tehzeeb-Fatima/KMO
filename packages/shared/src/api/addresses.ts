import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type AddressRow = Database["public"]["Tables"]["addresses"]["Row"];
type AddressInsert = Database["public"]["Tables"]["addresses"]["Insert"];
type AddressUpdate = Database["public"]["Tables"]["addresses"]["Update"];

export async function listAddresses(supabase: Client): Promise<AddressRow[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAddress(
  supabase: Client,
  input: AddressInsert,
): Promise<AddressRow> {
  const { data, error } = await supabase
    .from("addresses")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateAddress(
  supabase: Client,
  id: string,
  patch: AddressUpdate,
): Promise<AddressRow> {
  const { data, error } = await supabase
    .from("addresses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAddress(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw error;
}
