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
  /** 0 = points never expire. */
  expiry_months: number;
  /** Points that will lapse in the next 30 days. */
  expiring_soon: number;
  /** Every Nth delivered order earns repeat_bonus_points (0 = off). */
  repeat_every: number;
  repeat_bonus_points: number;
  delivered_orders: number;
  referrer_points: number;
  referee_points: number;
  /** New customer with no orders who hasn't used a referral code yet. */
  can_claim_referral: boolean;
  /** Lifetime delivered shopping that counts towards milestones. */
  lifetime_spend: number;
  /** spend_pkr of each milestone already credited. */
  milestones_reached: number[];
  wallet_balance: number;
  pending_conversion: { id: string; points: number; amount_pkr: number; created_at: string } | null;
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
    lifetime_spend: Number(data.lifetime_spend ?? 0),
    milestones_reached: (data.milestones_reached ?? []).map(Number),
    wallet_balance: Number(data.wallet_balance ?? 0),
    pending_conversion: data.pending_conversion
      ? { ...data.pending_conversion, amount_pkr: Number(data.pending_conversion.amount_pkr) }
      : null,
    rule: data.rule ? { ...data.rule, spend_pkr: Number(data.rule.spend_pkr) } : null,
  };
}

// ---------------------------------------------------------------- points to cash + wallet

type ConversionRow = Database["public"]["Tables"]["loyalty_conversion_requests"]["Row"];
type WalletRow = Database["public"]["Tables"]["wallet_ledger"]["Row"];
export type PointsConversion = ConversionRow;
export type WalletEntry = WalletRow;

/** Ask to turn points into wallet rupees. Points are held until an admin decides. */
export async function requestPointsConversion(supabase: Client, points: number): Promise<string> {
  const { data, error } = await rpc<string>(supabase, "request_points_conversion", { p_points: Math.floor(points) });
  if (error) throw error;
  return data;
}

export async function listMyPointsConversions(supabase: Client): Promise<ConversionRow[]> {
  const { data, error } = await supabase
    .from("loyalty_conversion_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

export async function listMyWalletLedger(supabase: Client): Promise<WalletRow[]> {
  const { data, error } = await supabase
    .from("wallet_ledger")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export interface AdminPointsConversionRow {
  id: string;
  customer_id: string;
  full_name: string | null;
  phone: string | null;
  points: number;
  amount_pkr: number;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  points_balance: number;
  wallet_balance: number;
  lifetime_spend: number;
  delivered_orders: number;
}

export async function listPointsConversions(
  supabase: Client,
  status: "pending" | "all" = "pending",
): Promise<AdminPointsConversionRow[]> {
  const { data, error } = await rpc<AdminPointsConversionRow[]>(supabase, "admin_points_conversions", {
    p_status: status,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    amount_pkr: Number(r.amount_pkr),
    wallet_balance: Number(r.wallet_balance),
    lifetime_spend: Number(r.lifetime_spend),
    delivered_orders: Number(r.delivered_orders),
  }));
}

export async function reviewPointsConversion(
  supabase: Client,
  id: string,
  approve: boolean,
  note?: string,
): Promise<void> {
  const { error } = await rpc<null>(supabase, "admin_review_points_conversion", {
    p_id: id,
    p_approve: approve,
    p_note: note ?? null,
  });
  if (error) throw error;
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

// ---------------------------------------------------------------- referrals

export async function getMyReferralCode(supabase: Client): Promise<string> {
  const { data, error } = await rpc<string>(supabase, "my_referral_code");
  if (error) throw error;
  return data;
}

/** Links the signed-in new customer to a friend's code; returns the friend's first name. */
export async function claimReferral(supabase: Client, code: string): Promise<string> {
  const { data, error } = await rpc<string>(supabase, "claim_referral", { p_code: code });
  if (error) throw error;
  return data;
}

export interface ReferralRow {
  id: string;
  referrer_name: string | null;
  referee_name: string | null;
  code: string;
  created_at: string;
  rewarded_at: string | null;
}

export async function listReferrals(supabase: Client): Promise<ReferralRow[]> {
  const { data, error } = await rpc<ReferralRow[]>(supabase, "admin_loyalty_referrals");
  if (error) throw error;
  return data ?? [];
}

export interface VendorReferralRow {
  store_name: string;
  joined_at: string;
  verification_status: string;
}

/** Stores this vendor brought to KMO (recorded by the admin). */
export async function listVendorReferrals(supabase: Client, vendorId: string): Promise<VendorReferralRow[]> {
  const { data, error } = await rpc<VendorReferralRow[]>(supabase, "vendor_referrals", { p_vendor: vendorId });
  if (error) throw error;
  return data ?? [];
}
