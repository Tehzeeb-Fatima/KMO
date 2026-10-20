import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { nonEmptyCategories } from "../lib/category-tree";
import { parseCsv, toCsv } from "../lib/csv";
import { cleanProductText, formatProductTitle } from "../lib/product-title";
import { suggestCategories } from "../lib/category-suggest";

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
  vendors: { id: string; store_name: string; slug: string; owner_id: string } | null;
}

const PRODUCT_WITH_MEDIA_SELECT =
  "*, product_images(*), product_variants(*), vendors(id, store_name, slug, owner_id)";

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
  })[]
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("products")
    .select(
      "*, product_images(*), product_variants(*), vendors!inner(owner_id)",
    )
    .eq("vendor_id", vendorId)
    .eq("vendors.owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as (ProductRow & {
    product_images: ProductImageRow[];
    product_variants: ProductVariantRow[];
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

/** Applies the house style to a product's name and text before it's saved. */
function tidyProductText<T extends { name?: string; description?: string | null }>(input: T): T {
  const out = { ...input };
  if (typeof out.name === "string") out.name = formatProductTitle(out.name);
  if (typeof out.description === "string") out.description = cleanProductText(out.description);
  return out;
}

function tidyVariant<T extends { option_value?: string }>(input: T): T {
  if (typeof input.option_value !== "string") return input;
  return { ...input, option_value: input.option_value.split(" / ").map(formatProductTitle).join(" / ") };
}

export async function createProduct(
  supabase: Client,
  input: ProductInsert,
): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("products")
    .insert(tidyProductText(input))
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
    .update(tidyProductText(patch))
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

/** Hard delete — for a product that's already archived. Images, variants,
 *  reviews etc. cascade with it; past order line items keep their own
 *  snapshot (name/price) and just lose the product link. Cannot be undone. */
export async function deleteProductPermanently(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkDeleteProductsPermanently(supabase: Client, ids: string[]): Promise<void> {
  const { error } = await supabase.from("products").delete().in("id", ids);
  if (error) throw error;
}

/** Bulk approve/reject from moderation. Rejected products are stored as
 *  "archived" — same as the single-item Reject button — there's no separate
 *  "rejected" status in the database. */
export async function bulkSetProductStatus(
  supabase: Client,
  ids: string[],
  status: "published" | "archived",
): Promise<void> {
  const { error } = await supabase.from("products").update({ status }).in("id", ids);
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
    .insert(tidyVariant(input))
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
    /** Substring match on the product name — for pickers where partial words must match. */
    nameContains?: string;
    productIds?: string[];
    limit?: number;
  },
): Promise<ProductWithMedia[]> {
  if (filter?.productIds && filter.productIds.length === 0) return [];

  let query = supabase
    .from("products")
    .select(PRODUCT_WITH_MEDIA_SELECT)
    .eq("status", "published");

  if (filter?.productIds) query = query.in("id", filter.productIds);
  if (filter?.categoryId) {
    // A main category also shows everything listed in its sub-categories.
    const { data: subs, error: subsError } = await supabase
      .from("categories")
      .select("id")
      .eq("parent_id", filter.categoryId);
    if (subsError) throw subsError;
    query = query.in("category_id", [filter.categoryId, ...(subs ?? []).map((c) => c.id)]);
  }
  if (filter?.vendorId) query = query.eq("vendor_id", filter.vendorId);
  if (typeof filter?.minPrice === "number") query = query.gte("price", filter.minPrice);
  if (typeof filter?.maxPrice === "number") query = query.lte("price", filter.maxPrice);
  if (filter?.search) {
    query = query.textSearch("search_vector", filter.search, {
      type: "websearch",
      config: "english",
    });
  }
  if (filter?.nameContains) {
    const escaped = filter.nameContains.replace(/[\\%_]/g, (c) => `\\${c}`);
    query = query.ilike("name", `%${escaped}%`);
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

/** Products by id, across any vendor — for admin pickers (e.g. scoping a
 *  promotion to specific products) that need to resolve a saved id list back
 *  into display names. */
export async function getProductsByIds(
  supabase: Client,
  ids: string[],
): Promise<{ id: string; name: string; slug: string; price: number; vendors: { store_name: string } | null }[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, price, vendors(store_name)")
    .in("id", ids);
  if (error) throw error;
  return data as unknown as {
    id: string;
    name: string;
    slug: string;
    price: number;
    vendors: { store_name: string } | null;
  }[];
}

/** Storefront categories: only those with published products (see nonEmptyCategories). */
export async function listShopCategories(supabase: Client): Promise<CategoryRow[]> {
  const [categories, counts] = await Promise.all([
    listCategories(supabase),
    supabase.from("category_product_counts").select("category_id, product_count"),
  ]);
  if (counts.error) throw counts.error;
  const countById = new Map(
    (counts.data ?? []).map((r) => [r.category_id, r.product_count]),
  );
  return nonEmptyCategories(categories, countById);
}

export async function listCategories(supabase: Client): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");
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

// ── Bulk upload (CSV) ─────────────────────────────────────────────────────

const PRODUCT_TEMPLATE_HEADERS = [
  "name",
  "description",
  "category",
  "price",
  "compare_at_price",
  "stock_quantity",
  "sku",
  "brand",
  "tags",
  "weight_grams",
  "image_urls",
] as const;

/** A reference CSV vendors/admins can fill in and re-upload: headers, one
 *  filled-in dummy row, and a comment block listing the real category names
 *  this store uses (so "category" values actually match). */
export function buildProductTemplateCsv(categories: CategoryRow[]): string {
  const sampleCategory = categories.find((c) => c.parent_id !== null)?.name ?? categories[0]?.name ?? "";
  const rows: string[][] = [
    [...PRODUCT_TEMPLATE_HEADERS],
    [
      "Sample Cotton T-Shirt",
      "Soft 100% cotton t-shirt, available in multiple sizes.",
      sampleCategory,
      "999",
      "1299",
      "50",
      "SKU-0001",
      "Sample Brand",
      "cotton;casual;unisex",
      "250",
      "https://example.com/image1.jpg|https://example.com/image2.jpg",
    ],
  ];
  let csv = toCsv(rows) + "\r\n\r\n";
  csv += "# This row is a dummy example — replace it (and add more rows) with your own products, then remove this line.\r\n";
  csv += "# price is required. Leave stock_quantity blank for always-in-stock.\r\n";
  csv += "# tags: separate multiple with  ;      image_urls: separate multiple with  |\r\n";
  csv += "# category must match one of the names below exactly (case doesn't matter). Leave blank for uncategorized.\r\n";
  const names = categories.map((c) => c.name);
  for (let i = 0; i < names.length; i += 6) {
    csv += "# " + names.slice(i, i + 6).join(", ") + "\r\n";
  }
  return csv;
}

interface ParsedProductRow {
  rowNumber: number;
  name: string;
  description: string | null;
  categoryName: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number | null;
  sku: string | null;
  brand: string | null;
  tags: string[];
  weight_grams: number | null;
  image_urls: string[];
}

/** Parses the uploaded CSV back into rows, skipping blank lines and lines
 *  starting with "#" (the template's own comment block). Doesn't touch the
 *  database — validation + category/slug resolution happens in bulkCreateProducts. */
export function parseProductCsv(text: string): { rows: ParsedProductRow[]; errors: { row: number; message: string }[] } {
  const raw = parseCsv(text).filter((r) => r.some((cell) => cell.trim() !== "") && !(r[0] ?? "").trim().startsWith("#"));
  if (raw.length === 0) return { rows: [], errors: [] };

  const header = raw[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    name: col("name"),
    description: col("description"),
    category: col("category"),
    price: col("price"),
    compareAtPrice: col("compare_at_price"),
    stockQuantity: col("stock_quantity"),
    sku: col("sku"),
    brand: col("brand"),
    tags: col("tags"),
    weightGrams: col("weight_grams"),
    imageUrls: col("image_urls"),
  };
  if (idx.name === -1 || idx.price === -1) {
    return { rows: [], errors: [{ row: 1, message: 'The file needs at least "name" and "price" columns.' }] };
  }

  const rows: ParsedProductRow[] = [];
  const errors: { row: number; message: string }[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const rowNumber = i + 1; // 1-based, matches what a spreadsheet shows
    const name = (r[idx.name] ?? "").trim();
    const priceText = (r[idx.price] ?? "").trim();
    if (!name && !priceText) continue;
    if (!name) {
      errors.push({ row: rowNumber, message: "Missing name." });
      continue;
    }
    const price = Number(priceText);
    if (!priceText || Number.isNaN(price) || price < 0) {
      errors.push({ row: rowNumber, message: `Missing or invalid price for "${name}".` });
      continue;
    }
    const compareAtText = idx.compareAtPrice >= 0 ? (r[idx.compareAtPrice] ?? "").trim() : "";
    const stockText = idx.stockQuantity >= 0 ? (r[idx.stockQuantity] ?? "").trim() : "";
    const weightText = idx.weightGrams >= 0 ? (r[idx.weightGrams] ?? "").trim() : "";

    rows.push({
      rowNumber,
      name,
      description: idx.description >= 0 ? (r[idx.description] ?? "").trim() || null : null,
      categoryName: idx.category >= 0 ? (r[idx.category] ?? "").trim() : "",
      price,
      compare_at_price: compareAtText ? Number(compareAtText) : null,
      stock_quantity: stockText ? Number(stockText) : null,
      sku: idx.sku >= 0 ? (r[idx.sku] ?? "").trim() || null : null,
      brand: idx.brand >= 0 ? (r[idx.brand] ?? "").trim() || null : null,
      tags:
        idx.tags >= 0
          ? (r[idx.tags] ?? "")
              .split(";")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      weight_grams: weightText ? Number(weightText) : null,
      image_urls:
        idx.imageUrls >= 0
          ? (r[idx.imageUrls] ?? "")
              .split("|")
              .map((u) => u.trim())
              .filter(Boolean)
          : [],
    });
  }
  return { rows, errors };
}

export interface BulkUploadResult {
  created: number;
  errors: { row: number; message: string }[];
}

/** Creates one product per valid row (status "pending" if it has at least one
 *  image URL, else "draft" — so nothing goes to moderation without a photo).
 *  Rows that fail validation, or whose category name doesn't match, are
 *  skipped and reported; nothing partially writes for a bad row. */
export async function bulkCreateProductsFromCsv(
  supabase: Client,
  vendorId: string,
  csvText: string,
): Promise<BulkUploadResult> {
  const { rows, errors } = parseProductCsv(csvText);
  const allErrors = [...errors];
  if (rows.length === 0) return { created: 0, errors: allErrors };

  const categories = await listCategories(supabase);
  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));

  // Any sub-category is allowed (the admin checks it when approving). A main
  // category that has sub-categories isn't, so products land where shoppers browse.
  const hasChildren = new Set(categories.filter((c) => c.parent_id).map((c) => c.parent_id as string));

  let created = 0;
  for (const row of rows) {
    let categoryId: string | null = null;
    if (row.categoryName) {
      categoryId = categoryByName.get(row.categoryName.toLowerCase()) ?? null;
      if (!categoryId) {
        allErrors.push({ row: row.rowNumber, message: `Category "${row.categoryName}" not found — skipped.` });
        continue;
      }
      if (hasChildren.has(categoryId)) {
        allErrors.push({
          row: row.rowNumber,
          message: `"${row.categoryName}" is a main category — use one of its sub-categories instead. Skipped.`,
        });
        continue;
      }
    } else {
      // No category given: use the best match for the product name.
      categoryId = suggestCategories(row.name, categories, 1)[0]?.id ?? null;
    }

    const slug = `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}-${row.rowNumber}`;
    const insert: ProductInsert = {
      vendor_id: vendorId,
      category_id: categoryId,
      name: row.name,
      slug,
      description: row.description,
      price: row.price,
      compare_at_price: row.compare_at_price,
      stock_quantity: row.stock_quantity,
      sku: row.sku,
      brand: row.brand,
      tags: row.tags,
      weight_grams: row.weight_grams,
      status: row.image_urls.length > 0 ? "pending" : "draft",
    };

    const { data: product, error } = await supabase.from("products").insert(tidyProductText(insert)).select("id").single();
    if (error || !product) {
      allErrors.push({ row: row.rowNumber, message: error?.message ?? `Could not create "${row.name}".` });
      continue;
    }

    if (row.image_urls.length > 0) {
      const imagesPayload = row.image_urls.map((url, i) => ({
        product_id: product.id,
        url,
        sort_order: i,
      }));
      const { error: imgError } = await supabase.from("product_images").insert(imagesPayload);
      if (imgError) {
        allErrors.push({ row: row.rowNumber, message: `"${row.name}" was created, but its photos failed to save: ${imgError.message}` });
      }
    }

    created++;
  }

  return { created, errors: allErrors };
}

// ---------------------------------------------------------------- vendor price (super admin only)

/** What KMO pays the vendor for a product it lists on their behalf. RLS lets
 *  only the super admin read or write it; for anyone else this returns null. */
export async function getVendorPrice(supabase: Client, productId: string): Promise<number | null> {
  const { data } = await supabase.from("product_costs").select("vendor_price").eq("product_id", productId).maybeSingle();
  return data ? Number(data.vendor_price) : null;
}

/** Set (or with null, clear) a product's vendor price. */
export async function setVendorPrice(supabase: Client, productId: string, vendorPrice: number | null): Promise<void> {
  const table = supabase.from("product_costs");
  const { error } =
    vendorPrice === null
      ? await table.delete().eq("product_id", productId)
      : await table.upsert({ product_id: productId, vendor_price: vendorPrice, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------------------------------------------------------------- product video

export const MAX_VIDEO_MB = 50;

/** Uploads an MP4/WebM and stores it on the product. */
export async function uploadProductVideo(supabase: Client, productId: string, file: File): Promise<string> {
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Video must be under ${MAX_VIDEO_MB} MB.`);
  const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
  const path = `${productId}/video-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-media").upload(path, file, { contentType: file.type || "video/mp4" });
  if (error) throw error;
  const url = supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
  const { error: ue } = await supabase.from("products").update({ video_url: url }).eq("id", productId);
  if (ue) throw ue;
  return url;
}

export async function removeProductVideo(supabase: Client, productId: string, url: string): Promise<void> {
  const path = url.split("/product-media/")[1]?.split("?")[0];
  if (path) await supabase.storage.from("product-media").remove([path]);
  const { error } = await supabase.from("products").update({ video_url: null }).eq("id", productId);
  if (error) throw error;
}
