import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrderStatus, PaymentMethod } from "../types";

type Client = SupabaseClient<Database>;
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
  vendors: { store_name: string } | null;
}

export interface PlaceOrderInput {
  addressId: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

export interface PlaceOrderResult {
  orders: { id: string; order_number: string; vendor_id: string; total: number }[];
}

/** Calls the `place_order` Edge Function, which validates stock, creates one
 * order per vendor represented in the cart, decrements stock, and clears the cart. */
export async function placeOrder(
  supabase: Client,
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const { data, error } = await supabase.functions.invoke("place_order", {
    body: {
      address_id: input.addressId,
      payment_method: input.paymentMethod,
      coupon_code: input.couponCode || undefined,
    },
  });
  if (error) throw error;
  return data as PlaceOrderResult;
}

const ORDER_WITH_ITEMS_SELECT = "*, order_items(*), vendors(store_name)";

export async function listMyOrders(supabase: Client): Promise<OrderWithItems[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_ITEMS_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as OrderWithItems[];
}

export async function getOrderById(
  supabase: Client,
  id: string,
): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_ITEMS_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as OrderWithItems | null;
}

export async function listOrdersByCheckoutGroup(
  supabase: Client,
  checkoutGroup: string,
): Promise<OrderWithItems[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_ITEMS_SELECT)
    .eq("checkout_group", checkoutGroup);
  if (error) throw error;
  return data as unknown as OrderWithItems[];
}

export interface VendorOrderRow extends OrderWithItems {
  profiles: { full_name: string | null } | null;
}

/** Vendor's own orders, newest first. */
export async function listVendorOrders(
  supabase: Client,
  vendorId: string,
  status?: OrderStatus,
): Promise<VendorOrderRow[]> {
  let query = supabase
    .from("orders")
    .select("*, order_items(*), vendors(store_name), profiles(full_name)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as VendorOrderRow[];
}

export interface AdminOrderRow extends OrderRow {
  order_items: OrderItemRow[];
  vendors: { store_name: string; owner_id: string } | null;
  profiles: { full_name: string | null } | null;
}

/** All orders platform-wide, for the admin Orders list. */
export async function listAllOrders(supabase: Client): Promise<AdminOrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), vendors(store_name, owner_id), profiles(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as AdminOrderRow[];
}

export async function updateOrderStatus(
  supabase: Client,
  orderId: string,
  status: OrderStatus,
): Promise<OrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
