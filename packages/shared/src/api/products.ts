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
  product_360_images: { id: string; angle_index: number; url: string; variant_id: string | null }[];
  vendors: { id: string; store_name: string; slug: string; owner_id: string } | null;
}

const PRODUCT_WITH_MEDIA_SELECT =
  "*, product_images(*), product_variants(*), product_360_images(id, angle_index, url, variant_id), vendors(id, store_name, slug, owner_id)";

/** Vendor's own products (any status), for the Products list dashboard page.
 *
 *  Scoped two ways on purpose. `products` also carries a public-select policy
 *  for published rows, and Postgres ORs permissive RLS policies together — so
 *  RLS alone would happily return other vendors' live products here. The
 *  `vendors!inner(owner_id)` join pins the result set to stores the caller
 *  actually owns, which no caller can accidentally widen by passing someone
 *  else's vendorId. */
export async function listMyProducts(
  supabase: Client,
  vendorId: string,
): Promise<
  (ProductRow & {
    product_images: ProductImageRow[];
    product_variants: ProductVariantRow[];
    product_360_images: { id: string; angle_index: number; url: string; variant_id: string | null }[];
  })[]
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("products")
    .select(
      "*, product_images(*), product_variants(*), product_360_images(id, angle_index, url, variant_id), vendors!inner(owner_id)",
    )
    .eq("vendor_id", vendorId)
    .eq("vendors.owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as (ProductRow & {
    product_images: ProductImageRow[];
    product_variants: ProductVariantRow[];
    product_360_images: { id: string; angle_index: number; url: string; variant_id: string | null }[];
  })[];
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

/** Storefront product pages route on the readable slug, not the id. */
export async function getProductBySlug(
  supabase: Client,
  slug: string,
): Promise<ProductWithMedia | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_MEDIA_SELECT)
    .eq("slug", slug)
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

/** Bulk single/multi delete: soft-deletes by archiving, same as the single-item flow. */
export async function bulkArchiveProducts(supabase: Client, ids: string[]): Promise<void> {
  const { error } = await supabase.from("products").update({ status: "archived" }).in("id", ids);
  if (error) throw error;
}

export async function addProductImage(
  supabase: Client,
  productId: string,
  url: string,
  sortOrder: number,
  /** Tie the photo to one colour variant; omit to show it for every colour. */
  variantId?: string | null,
): Promise<ProductImageRow> {
  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url, sort_order: sortOrder, variant_id: variantId ?? null })
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

/* ── optional 360° view ─────────────────────────────────────────────────── */

type Product360ImageRow = Database["public"]["Tables"]["product_360_images"]["Row"];

/** Fewest frames that make a usable spin. */
export const MIN_360_FRAMES = 8;
/** What the DB check constraint allows. */
export const MAX_360_FRAMES = 72;
/** Frame count where the spin starts feeling like a pro turntable. */
export const RECOMMENDED_360_FRAMES = 24;

/** Angle names for the first eight frames, used purely as shooting guidance —
 *  more frames than this is better, they just don't get a name. */
export const PRODUCT_360_ANGLES: { index: number; label: string }[] = [
  { index: 1, label: "Front" },
  { index: 2, label: "Front Right" },
  { index: 3, label: "Right" },
  { index: 4, label: "Back Right" },
  { index: 5, label: "Back" },
  { index: 6, label: "Back Left" },
  { index: 7, label: "Left" },
  { index: 8, label: "Front Left" },
];

/** Every 360° frame for a product, across all colour sets. */
export async function list360Images(
  supabase: Client,
  productId: string,
): Promise<Product360ImageRow[]> {
  const { data, error } = await supabase
    .from("product_360_images")
    .select("*")
    .eq("product_id", productId)
    .order("angle_index");
  if (error) throw error;
  return data;
}

/** Uploads one frame into the existing `product-media` bucket, under a `360/`
 *  sub-path so it never mixes with the normal gallery images. Storage RLS
 *  keys off the first path segment (the product id), so it just works. */
export async function upload360Image(
  supabase: Client,
  productId: string,
  angleIndex: number,
  file: File,
  variantId?: string | null,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const setFolder = variantId ?? "default";
  const path = `${productId}/360/${setFolder}/${angleIndex}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-media").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("product-media").getPublicUrl(path);
  return data.publicUrl;
}

/** Sets (or replaces) one frame of one colour set. Delete-then-insert rather
 *  than upsert, because the conflict target involves a nullable variant_id. */
export async function set360Image(
  supabase: Client,
  productId: string,
  angleIndex: number,
  url: string,
  variantId?: string | null,
): Promise<Product360ImageRow> {
  await remove360Image(supabase, productId, angleIndex, variantId);

  const { data, error } = await supabase
    .from("product_360_images")
    .insert({ product_id: productId, variant_id: variantId ?? null, angle_index: angleIndex, url })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function remove360Image(
  supabase: Client,
  productId: string,
  angleIndex: number,
  variantId?: string | null,
): Promise<void> {
  let query = supabase
    .from("product_360_images")
    .delete()
    .eq("product_id", productId)
    .eq("angle_index", angleIndex);
  query = variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null);
  const { error } = await query;
  if (error) throw error;
}

/** Drops every frame of one colour set (the "start over" action). */
export async function clear360Set(
  supabase: Client,
  productId: string,
  variantId?: string | null,
): Promise<void> {
  let query = supabase.from("product_360_images").delete().eq("product_id", productId);
  query = variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null);
  const { error } = await query;
  if (error) throw error;
}

/** A product's extra categories, beyond its primary category_id — lets it
 *  show up under more than one of the vendor's assigned categories. */
export async function listProductCategories(
  supabase: Client,
  productId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("category_id")
    .eq("product_id", productId);
  if (error) throw error;
  return data.map((row) => row.category_id);
}

/** Replaces a product's extra-category set with exactly this list. */
export async function setProductCategories(
  supabase: Client,
  productId: string,
  categoryIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("product_categories")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw deleteError;

  if (categoryIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("product_categories")
    .insert(categoryIds.map((category_id) => ({ product_id: productId, category_id })));
  if (insertError) throw insertError;
}

type ProductVariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];

/** e.g. { option_name: "Color", option_value: "Red", stock_quantity: 10 } — a
 *  vendor can add as many of these as needed (Color, Size, ...); the
 *  storefront groups them by option_name automatically. */
export async function createProductVariant(
  supabase: Client,
  input: ProductVariantInsert,
): Promise<ProductVariantRow> {
  const { data, error } = await supabase
    .from("product_variants")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProductVariant(
  supabase: Client,
  id: string,
  patch: Partial<Pick<ProductVariantRow, "price_override" | "stock_quantity" | "sku">>,
): Promise<ProductVariantRow> {
  const { data, error } = await supabase
    .from("product_variants")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function removeProductVariant(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("product_variants").delete().eq("id", id);
  if (error) throw error;
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
