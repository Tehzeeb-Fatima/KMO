import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];
type ProductVariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export interface ProductWithMedia extends ProductRow {
  product_images: ProductImageRow[];
  product_variants: ProductVariantRow[];
  vendors: { id: string; store_name: string; slug: string } | null;
}

const PRODUCT_WITH_MEDIA_SELECT =
  "*, product_images(*), product_variants(*), vendors(id, store_name, slug)";

/** Vendor's own products (any status), for the Products list dashboard page. */
export async function listMyProducts(
  supabase: Client,
  vendorId: string,
): Promise<(ProductRow & { product_images: ProductImageRow[] })[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as (ProductRow & { product_images: ProductImageRow[] })[];
}

export async function getProductById(
  supabase: Client,
  id: string,
): Promise<ProductWithMedia | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_MEDIA_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ProductWithMedia | null;
}

export async function createProduct(
  supabase: Client,
  input: ProductInsert,
): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("products")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  supabase: Client,
  id: string,
  patch: ProductUpdate,
): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function addProductImage(
  supabase: Client,
  productId: string,
  url: string,
  sortOrder: number,
): Promise<ProductImageRow> {
  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url, sort_order: sortOrder })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function removeProductImage(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProductImage(
  supabase: Client,
  productId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-media").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("product-media").getPublicUrl(path);
  return data.publicUrl;
}

/** Public catalogue browse: published products from approved vendors. */
export async function listPublishedProducts(
  supabase: Client,
  filter?: {
    categoryId?: string;
    vendorId?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "newest" | "price_asc" | "price_desc";
    search?: string;
    limit?: number;
  },
): Promise<ProductWithMedia[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_WITH_MEDIA_SELECT)
    .eq("status", "published");

  if (filter?.categoryId) query = query.eq("category_id", filter.categoryId);
  if (filter?.vendorId) query = query.eq("vendor_id", filter.vendorId);
  if (typeof filter?.minPrice === "number") query = query.gte("price", filter.minPrice);
  if (typeof filter?.maxPrice === "number") query = query.lte("price", filter.maxPrice);
  if (filter?.search) {
    query = query.textSearch("search_vector", filter.search, {
      type: "websearch",
      config: "english",
    });
  }

  if (filter?.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (filter?.sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  if (filter?.limit) query = query.limit(filter.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ProductWithMedia[];
}

export async function getPublishedProductBySlug(
  supabase: Client,
  vendorId: string,
  slug: string,
): Promise<ProductWithMedia | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_MEDIA_SELECT)
    .eq("vendor_id", vendorId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ProductWithMedia | null;
}

export async function listCategories(supabase: Client): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data;
}

/** Admin moderation: every product, optionally filtered to pending-only. */
export async function listAllProductsForModeration(
  supabase: Client,
  pendingOnly?: boolean,
): Promise<ProductWithMedia[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_WITH_MEDIA_SELECT)
    .order("created_at", { ascending: false });
  if (pendingOnly) query = query.eq("status", "pending");
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ProductWithMedia[];
}
