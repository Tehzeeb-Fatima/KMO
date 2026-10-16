import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourierBookingStatus, Database } from "../types";

type Client = SupabaseClient<Database>;
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

// ── vendor side ──────────────────────────────────────────────────────────

/** Whether this vendor has linked a Courier Fast Service account yet, and
 * whether admin has marked them ready to see the connect popup at all. */
export async function getVendorCourierStatus(
  supabase: Client,
  vendorId: string,
): Promise<{ connected: boolean; popupReady: boolean }> {
  const { data, error } = await supabase
    .from("vendors")
    .select("courier_connected, courier_popup_ready")
    .eq("id", vendorId)
    .single();
  if (error) throw error;
  return { connected: data.courier_connected, popupReady: data.courier_popup_ready };
}

/** Vendor enters the password admin gave them; the edge function links the
 * Courier account and stores the resulting API token server-side. */
export async function connectVendorToCourier(
  supabase: Client,
  password: string,
): Promise<{ connected: true }> {
  const { data, error } = await supabase.functions.invoke("courier_connect", {
    body: { password },
  });
  if (error) {
    let message = error.message;
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === "function") {
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        // body wasn't JSON — keep the generic message
      }
    }
    throw new Error(message);
  }
  return data as { connected: true };
}

/** Vendor requests courier booking for one or more of their own orders.
 * Does NOT call Courier — just flags the order for admin review. */
export async function requestCourierBooking(
  supabase: Client,
  orderIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ courier_booking_status: "pending_review", courier_requested_at: new Date().toISOString() })
    .in("id", orderIds)
    .in("courier_booking_status", ["not_requested", "rejected"]);
  if (error) throw error;
}

// ── admin side ───────────────────────────────────────────────────────────

/** Admin sets (or resets) the one-time password a vendor will use to link
 * their Courier account. Stored only until courier_connect consumes it. */
export async function setVendorCourierPassword(
  supabase: Client,
  vendorId: string,
  password: string,
): Promise<void> {
  const { error } = await supabase
    .from("vendor_courier_accounts")
    .upsert({ vendor_id: vendorId, pending_password: password }, { onConflict: "vendor_id" });
  if (error) throw error;
}

/** Admin flips this once the vendor's password is ready to use — only then
 * does the connect popup show on the vendor's dashboard. */
export async function setVendorCourierPopupReady(
  supabase: Client,
  vendorId: string,
  ready: boolean,
): Promise<void> {
  const { error } = await supabase.from("vendors").update({ courier_popup_ready: ready }).eq("id", vendorId);
  if (error) throw error;
}

export interface VendorCourierAccountInfo {
  vendor_id: string;
  pending_password: string | null;
  connected_at: string | null;
}

export async function getVendorCourierAccount(
  supabase: Client,
  vendorId: string,
): Promise<VendorCourierAccountInfo | null> {
  const { data, error } = await supabase
    .from("vendor_courier_accounts")
    .select("vendor_id, pending_password, connected_at")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface CourierRequestRow extends OrderRow {
  vendors: { store_name: string } | null;
  profiles: { full_name: string | null } | null;
  order_items: { product_name: string; quantity: number }[];
}

/** Admin queue of vendor-requested courier bookings awaiting review. */
export async function listCourierRequests(
  supabase: Client,
  opts?: { vendorId?: string; status?: CourierBookingStatus },
): Promise<CourierRequestRow[]> {
  let query = supabase
    .from("orders")
    .select("*, vendors(store_name), profiles(full_name), order_items(product_name, quantity)")
    .order("courier_requested_at", { ascending: false });
  query = query.eq("courier_booking_status", opts?.status ?? "pending_review");
  if (opts?.vendorId) query = query.eq("vendor_id", opts.vendorId);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as CourierRequestRow[];
}

export async function rejectCourierBooking(
  supabase: Client,
  orderId: string,
  note: string,
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ courier_booking_status: "rejected", courier_rejection_note: note || null })
    .eq("id", orderId);
  if (error) throw error;
}

export interface PushCourierBookingsResult {
  results: { order_id: string; ok: boolean; tracking_id?: string; error?: string }[];
}

/** Admin approves one or more pending requests — this is the one call that
 * actually pushes a real booking to Courier Fast Service, using the owning
 * vendor's own linked account. */
export async function pushCourierBookings(
  supabase: Client,
  orderIds: string[],
): Promise<PushCourierBookingsResult> {
  const { data, error } = await supabase.functions.invoke("courier_push_booking", {
    body: { order_ids: orderIds },
  });
  if (error) {
    let message = error.message;
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === "function") {
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        // body wasn't JSON — keep the generic message
      }
    }
    throw new Error(message);
  }
  return data as PushCourierBookingsResult;
}
