import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReturnStatus } from "../types";

type Client = SupabaseClient<Database>;
type ReturnRow = Database["public"]["Tables"]["returns"]["Row"];

export interface ReturnWithOrder extends ReturnRow {
  orders: { order_number: string; vendor_id: string } | null;
}

export async function createReturnRequest(
  supabase: Client,
  input: { orderId: string; orderItemId?: string; customerId: string; reason: string },
): Promise<ReturnRow> {
  const { data, error } = await supabase
    .from("returns")
    .insert({
      order_id: input.orderId,
      order_item_id: input.orderItemId,
      customer_id: input.customerId,
      reason: input.reason,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listMyReturns(supabase: Client): Promise<ReturnWithOrder[]> {
  const { data, error } = await supabase
    .from("returns")
    .select("*, orders(order_number, vendor_id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as ReturnWithOrder[];
}

export async function listAllReturns(supabase: Client): Promise<ReturnWithOrder[]> {
  const { data, error } = await supabase
    .from("returns")
    .select("*, orders(order_number, vendor_id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as ReturnWithOrder[];
}

export async function updateReturnStatus(
  supabase: Client,
  id: string,
  status: ReturnStatus,
  adminNotes?: string,
): Promise<ReturnRow> {
  const { data, error } = await supabase
    .from("returns")
    .update({ status, admin_notes: adminNotes })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
