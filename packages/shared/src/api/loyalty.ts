import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type RuleRow = Database["public"]["Tables"]["loyalty_earn_rules"]["Row"];
type RuleInsert = Database["public"]["Tables"]["loyalty_earn_rules"]["Insert"];
type LedgerRow = Database["public"]["Tables"]["loyalty_ledger"]["Row"];

export type LoyaltyRule = RuleRow;
export type LoyaltyLedgerEntry = LedgerRow;

/** What a shopper needs: balance, the live earning offer and redemption rules. */
export interface MyLoyalty {
  enabled: boolean;
  balance: number;
  point_value: number;
  min_redeem_points: number;
  max_redeem_percent: number;
  rule: { name: string; spend_pkr: number; points: number; ends_at: string | null } | null;
}

// These functions/tables are newer than the generated type list for rpc names.
const rpc = <T>(supabase: Client, fn: string, args?: Record<string, unknown>) =>
  (supabase.rpc as unknown as (f: string, a?: Record<string, unknown>) => Promise<{ data: T; error: Error | null }>)(
    fn,
    args,
  );

export async function getMyLoyalty(supabase: Client): Promise<MyLoyalty> {
  const { data, error } = await rpc<MyLoyalty>(supabase, "my_loyalty");
  if (error) throw error;
  return {
    ...data,
    point_value: Number(data.point_value),
    max_redeem_percent: Number(data.max_redeem_percent),
    rule: data.rule ? { ...data.rule, spend_pkr: Number(data.rule.spend_pkr) } : null,
  };
}

export async function listMyLoyaltyLedger(supabase: Client): Promise<LedgerRow[]> {
  const { data, error } = await supabase.from("loyalty_ledger").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Points a basket would earn under the live rule (credited after delivery). */
export function pointsForAmount(amount: number, rule: MyLoyalty["rule"]): number {
  if (!rule || amount <= 0) return 0;
  return Math.floor((amount * rule.points) / rule.spend_pkr);
}

// ---------------------------------------------------------------- admin

export async function listLoyaltyRules(supabase: Client): Promise<RuleRow[]> {
  const { data, error } = await supabase.from("loyalty_earn_rules").select("*").order("starts_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveLoyaltyRule(supabase: Client, rule: RuleInsert & { id?: string }): Promise<void> {
  const { id, ...rest } = rule;
  const { error } = id
    ? await supabase.from("loyalty_earn_rules").update(rest).eq("id", id)
    : await supabase.from("loyalty_earn_rules").insert(rest);
  if (error) throw error;
}

export async function deleteLoyaltyRule(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("loyalty_earn_rules").delete().eq("id", id);
  if (error) throw error;
}

export interface LoyaltyBalanceRow {
  customer_id: string;
  full_name: string | null;
  phone: string | null;
  balance: number;
  last_activity: string;
}

export async function listLoyaltyBalances(supabase: Client): Promise<LoyaltyBalanceRow[]> {
  const { data, error } = await rpc<LoyaltyBalanceRow[]>(supabase, "admin_loyalty_balances");
  if (error) throw error;
  return data ?? [];
}

export async function listCustomerLedger(supabase: Client, customerId: string): Promise<LedgerRow[]> {
  const { data, error } = await supabase
    .from("loyalty_ledger")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function adjustLoyaltyPoints(supabase: Client, customerId: string, points: number, note: string): Promise<number> {
  const { data, error } = await rpc<number>(supabase, "admin_adjust_points", {
    p_customer: customerId,
    p_points: points,
    p_note: note,
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------- vendor tiers

export interface VendorPerformance {
  orders_total: number;
  orders_delivered: number;
  orders_cancelled: number;
  orders_returned: number;
  orders_open: number;
  delivered_sales: number;
  last_order_at: string | null;
  active_products: number;
}

export async function getVendorPerformance(supabase: Client, vendorId: string): Promise<VendorPerformance> {
  const { data, error } = await rpc<VendorPerformance>(supabase, "vendor_performance", { p_vendor: vendorId });
  if (error) throw error;
  return { ...data, delivered_sales: Number(data.delivered_sales) };
}

export const VENDOR_TIER_LABEL = { bronze: "Bronze", silver: "Silver", gold: "Gold" } as const;
