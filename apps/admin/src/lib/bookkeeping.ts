import { supabase } from "./supabase";

/** Data access for the super-admin Bookkeeping module. Every call goes through
 *  a bk_* database function that checks the device's unlock session, so the
 *  tables themselves are never readable directly. */

export type PartnerKey = "tehzeeb" | "talha";
export type PaidBy = PartnerKey | "kmo";

export const PAID_BY_LABEL: Record<PaidBy, string> = { tehzeeb: "Tehzeeb", talha: "Talha", kmo: "KMO" };
export const PAYMENT_METHODS = ["Cash", "Bank transfer", "Debit/credit card", "JazzCash", "EasyPaisa", "Other"];

export interface BkCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface BkExpense {
  id: string;
  expense_date: string;
  category_id: string | null;
  description: string;
  amount_pkr: number;
  amount_usd: number | null;
  paid_by: PaidBy;
  payment_method: string | null;
  notes: string | null;
  receipt_path: string | null;
  recurring_id: string | null;
  created_by: PartnerKey | null;
  created_at: string;
  updated_by: PartnerKey | null;
  updated_at: string;
}

export interface BkRecurring {
  id: string;
  description: string;
  category_id: string | null;
  amount_pkr: number;
  amount_usd: number | null;
  paid_by: PaidBy;
  payment_method: string | null;
  day_of_month: number;
  start_month: string;
  end_month: string | null;
  active: boolean;
  notes: string | null;
  created_by: PartnerKey | null;
  updated_by: PartnerKey | null;
}

export interface BkCapital {
  id: string;
  entry_date: string;
  partner: PartnerKey;
  kind: "investment" | "withdrawal";
  amount_pkr: number;
  notes: string | null;
  created_by: PartnerKey | null;
  updated_by: PartnerKey | null;
}

export interface BkActivity {
  id: number;
  at: string;
  person_key: PartnerKey | null;
  action: string;
  entity: string | null;
  details: Record<string, unknown> | null;
}

export interface BkStatus {
  super_admin: boolean;
  unlocked?: boolean;
  person?: PartnerKey | null;
  person_name?: string | null;
  expires_at?: string | null;
}

// ---------------------------------------------------------------- session

const SESSION_KEY = "kmo-bk-session";

export interface BkSession {
  token: string;
  personName: string;
  expiresAt: string;
}

export function readSession(): BkSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as BkSession;
    if (new Date(s.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(s: BkSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // Private mode: the unlock lasts only for this page view.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Thrown when the server says the device is no longer unlocked. */
export class LockedError extends Error {}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (
    f: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: T; error: { message: string } | null }>)(fn, args);
  if (error) {
    if (error.message.includes("BK_LOCKED")) throw new LockedError("Locked");
    throw new Error(error.message);
  }
  return data;
}

// ---------------------------------------------------------------- auth

export async function isSuperAdmin(): Promise<boolean> {
  return rpc<boolean>("is_super_admin", {});
}

export async function getStatus(token: string | null): Promise<BkStatus> {
  return rpc<BkStatus>("bk_status", { p_session: token });
}

async function callAuth<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("bookkeeping-auth", { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = ((await ctx.json()) as { error?: string }).error ?? message;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  return data as T;
}

export function sendCodes() {
  return callAuth<{ requestId: string; expiresAt: string; sentTo: string[] }>({ action: "send" });
}

/** Accepts a code from any email sent in the last 10 minutes. */
export function verifyCode(code: string) {
  return callAuth<{ token: string; personName: string; expiresAt: string }>({ action: "verify", code });
}

export function lock(token: string) {
  return rpc<void>("bk_lock", { p_session: token });
}

// ---------------------------------------------------------------- data

export const generateRecurring = (t: string) => rpc<number>("bk_generate_recurring", { p_session: t });
export const listCategories = (t: string) => rpc<BkCategory[]>("bk_categories", { p_session: t });
export const saveCategory = (t: string, id: string | null, name: string) =>
  rpc<string>("bk_save_category", { p_session: t, p_id: id, p_name: name });
export const deleteCategory = (t: string, id: string) => rpc<void>("bk_delete_category", { p_session: t, p_id: id });

export const listExpenses = (t: string) => rpc<BkExpense[]>("bk_expenses_list", { p_session: t });
export const saveExpense = (t: string, e: Record<string, unknown>) => rpc<string>("bk_save_expense", { p_session: t, p: e });
export const deleteExpense = (t: string, id: string) => rpc<string | null>("bk_delete_expense", { p_session: t, p_id: id });

export const listRecurring = (t: string) => rpc<BkRecurring[]>("bk_recurring_list", { p_session: t });
export const saveRecurring = (t: string, r: Record<string, unknown>) => rpc<string>("bk_save_recurring", { p_session: t, p: r });
export const deleteRecurring = (t: string, id: string) => rpc<void>("bk_delete_recurring", { p_session: t, p_id: id });

export const listCapital = (t: string) => rpc<BkCapital[]>("bk_capital_list", { p_session: t });
export const saveCapital = (t: string, c: Record<string, unknown>) => rpc<string>("bk_save_capital", { p_session: t, p: c });
export const deleteCapital = (t: string, id: string) => rpc<void>("bk_delete_capital", { p_session: t, p_id: id });

export interface BkMarginMonth {
  month: string;
  delivered_orders: number;
  sales: number;
  vendor_cost: number;
  margin: number;
}
/** KMO margin on delivered orders of products with a vendor price, by month. */
export const listMargin = (t: string) => rpc<BkMarginMonth[]>("bk_margin_summary", { p_session: t });
export const listActivity = (t: string) => rpc<BkActivity[]>("bk_activity_list", { p_session: t });

// ---------------------------------------------------------------- receipts

const RECEIPTS = "bk-receipts";

export async function uploadReceipt(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(RECEIPTS).upload(path, file);
  if (error) throw error;
  return path;
}

export async function receiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(RECEIPTS).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeReceipt(path: string) {
  await supabase.storage.from(RECEIPTS).remove([path]);
}

// ---------------------------------------------------------------- helpers

export const pkr = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;
export const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export const monthKey = (date: string) => date.slice(0, 7);
export const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" });
export const todayIso = () => new Date().toLocaleDateString("en-CA");
