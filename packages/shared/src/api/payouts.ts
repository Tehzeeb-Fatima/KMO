import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"];
type PayoutInsert = Database["public"]["Tables"]["payouts"]["Insert"];

export async function listVendorPayouts(
  supabase: Client,
  vendorId: string,
): Promise<PayoutRow[]> {
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export interface AdminPayoutSummary extends PayoutRow {
  vendors: { store_name: string } | null;
}

export async function listAdminPayouts(supabase: Client): Promise<AdminPayoutSummary[]> {
  const { data, error } = await supabase
    .from("payouts")
    .select("*, vendors(store_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as AdminPayoutSummary[];
}

/** Vendors owed (net_amount of delivered orders not yet attached to a payout). */
export async function getVendorDueAmount(supabase: Client, vendorId: string): Promise<number> {
  const { data, error } = await supabase
    .from("orders")
    .select("net_amount")
    .eq("vendor_id", vendorId)
    .eq("status", "delivered")
    .is("payout_id", null);
  if (error) throw error;
  return data.reduce((sum, o) => sum + o.net_amount, 0);
}

/** Platform-wide commission booked this calendar month, from delivered orders. */
export async function getPlatformCommissionThisMonth(supabase: Client): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("orders")
    .select("commission_amount")
    .gte("created_at", start.toISOString());
  if (error) throw error;
  return data.reduce((sum, o) => sum + o.commission_amount, 0);
}

export async function createPayout(
  supabase: Client,
  input: PayoutInsert,
): Promise<PayoutRow> {
  const { data, error } = await supabase
    .from("payouts")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Marks a payout paid and attaches every un-paid delivered order for that
 * vendor to it (so `orders.payout_id` reflects what was covered). */
export async function markPayoutPaid(
  supabase: Client,
  payoutId: string,
  vendorId: string,
  patch: { transaction_reference?: string; notes?: string; payout_date: string },
): Promise<PayoutRow> {
  const { data, error } = await supabase
    .from("payouts")
    .update({ status: "paid", ...patch })
    .eq("id", payoutId)
    .select("*")
    .single();
  if (error) throw error;

  await supabase
    .from("orders")
    .update({ payout_id: payoutId })
    .eq("vendor_id", vendorId)
    .eq("status", "delivered")
    .is("payout_id", null);

  return data;
}
