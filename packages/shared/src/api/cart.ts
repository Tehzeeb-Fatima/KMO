import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type CartItemRow = Database["public"]["Tables"]["cart_items"]["Row"];

export interface CartItemWithProduct extends CartItemRow {
  products: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    vendor_id: string;
    category_id: string | null;
    vendors: { id: string; store_name: string } | null;
    product_images: { url: string; sort_order: number }[];
  };
  product_variants: {
    id: string;
    option_name: string;
    option_value: string;
    price_override: number | null;
    stock_quantity: number;
  } | null;
}

const CART_SELECT =
  "*, products(id, name, price, stock_quantity, vendor_id, category_id, vendors(id, store_name), product_images(url, sort_order)), product_variants(id, option_name, option_value, price_override, stock_quantity)";

export async function listCartItems(supabase: Client): Promise<CartItemWithProduct[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(CART_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as unknown as CartItemWithProduct[];
}

export async function addToCart(
  supabase: Client,
  customerId: string,
  productId: string,
  variantId: string | null,
  quantity = 1,
): Promise<void> {
  let existingQuery = supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("customer_id", customerId)
    .eq("product_id", productId);
  existingQuery = variantId
    ? existingQuery.eq("variant_id", variantId)
    : existingQuery.is("variant_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("cart_items").insert({
    customer_id: customerId,
    product_id: productId,
    variant_id: variantId,
    quantity,
  });
  if (error) throw error;
}

export async function updateCartItemQuantity(
  supabase: Client,
  id: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
  if (error) throw error;
}

export async function removeCartItem(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("cart_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearCart(supabase: Client, customerId: string): Promise<void> {
  const { error } = await supabase.from("cart_items").delete().eq("customer_id", customerId);
  if (error) throw error;
}
