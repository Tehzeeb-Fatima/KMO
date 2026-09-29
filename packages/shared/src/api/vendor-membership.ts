import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type ChargeRow = Database["public"]["Tables"]["vendor_membership_charges"]["Row"];

/** Free-trial end date and current membership standing for a vendor, derived
 *  from their signup date and the platform's configured trial length — pure
 *  client-side math, no DB write needed just to *display* status. */
export function membershipStatus(
  membershipStartedAt: string,
  freeTrialMonths: number,
): { trialEndsAt: Date; inFreeTrial: boolean } {
  const start = new Date(membershipStartedAt);
  const trialEndsAt = new Date(start);
  trialEndsAt.setMonth(trialEndsAt.getMonth() + freeTrialMonths);
  return { trialEndsAt, inFreeTrial: trialEndsAt.getTime() > Date.now() };
}

export async function listMembershipCharges(
  supabase: Client,
  vendorId: string,
): Promise<ChargeRow[]> {
  const { data, error } = await supabase
    .from("vendor_membership_charges")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("period_start", { ascending: false });
  if (error) throw error;
  return data;
}

/** Admin logs one billing period's membership fee for a vendor — e.g. "this
 *  vendor paid their Rs. 499 for October" — collected outside the app
 *  (bank transfer, cash, etc.) and recorded here for record-keeping. */
export async function recordMembershipCharge(
  supabase: Client,
  input: {
    vendor_id: string;
    period_start: string;
    period_end: string;
    amount: number;
    status: "due" | "paid" | "waived";
    notes?: string | null;
    created_by: string;
  },
): Promise<ChargeRow> {
  const { data, error } = await supabase
    .from("vendor_membership_charges")
    .insert({
      ...input,
      paid_at: input.status === "paid" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function markMembershipChargePaid(
  supabase: Client,
  id: string,
): Promise<ChargeRow> {
  const { data, error } = await supabase
    .from("vendor_membership_charges")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
