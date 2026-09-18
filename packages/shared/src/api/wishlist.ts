import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

export interface WishlistItemWithProduct {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    slug: string;
    name: string;
    price: number;
    compare_at_price: number | null;
    vendor_id: string;
    vendors: { store_name: string } | null;
    product_images: { url: string; sort_order: number }[];
  };
}

export async function listWishlist(supabase: Client): Promise<WishlistItemWithProduct[]> {
  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      "id, product_id, created_at, products(id, slug, name, price, compare_at_price, vendor_id, vendors(store_name), product_images(url, sort_order))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as WishlistItemWithProduct[];
}

export async function isWishlisted(
  supabase: Client,
  customerId: string,
  productId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("customer_id", customerId)
    .eq("product_id", productId)
    .maybeSingle();
  return !!data;
}

export async function addToWishlist(
  supabase: Client,
  customerId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from("wishlist_items")
    .insert({ customer_id: customerId, product_id: productId });
  if (error) throw error;
}

export async function removeFromWishlist(
  supabase: Client,
  customerId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("customer_id", customerId)
    .eq("product_id", productId);
  if (error) throw error;
}
