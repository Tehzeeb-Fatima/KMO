import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addProductImage,
  bulkArchiveProducts,
  clear360Set,
  createProduct,
  createProductVariant,
  getMyVendor,
  listMyProducts,
  listProductCategories,
  listVendorCategories,
  MAX_360_FRAMES,
  MIN_360_FRAMES,
  remove360Image,
  removeProductImage,
  removeProductVariant,
  set360Image,
  setProductCategories,
  updateProduct,
  upload360Image,
  uploadProductImage,
} from "@kmo/shared/api";
import type { ProductStatus } from "@kmo/shared/types";
import {
  ConfirmDialog,
  Product360Uploader,
  type Product360ColourSet,
} from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

/** One uploaded 360° frame, in the shape the form keeps in state. */
type Product360Row = { angleIndex: number; url: string; variantId: string | null };

const STATUS_TABS: { label: string; value: ProductStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Archived", value: "archived" },
];

const STATUS_BADGE: Record<ProductStatus, { label: string; bg: string; color: string }> = {
  published: { label: "Live", bg: "var(--color-success-tint)", color: "var(--color-success-dark)" },
  draft: { label: "Draft", bg: "var(--color-primary-tint)", color: "var(--color-primary)" },
  pending: { label: "Pending", bg: "var(--color-warning-tint)", color: "var(--color-warning)" },
  archived: { label: "Archived", bg: "var(--color-danger-tint)", color: "var(--color-danger)" },
};

function stockColor(stock: number, threshold: number) {
  if (stock <= 0) return "var(--color-danger)";
  if (stock <= threshold) return "var(--color-warning)";
  return "var(--color-success)";
}

function stockLabel(stock: number) {
  return stock <= 0 ? "Out of stock" : `${stock} in stock`;
}

export function ProductsPage() {
  const [editingId, setEditingId] = useState<string | null | "new">(null);

  const { data: vendor } = useQuery({
    queryKey: ["my-vendor"],
    queryFn: () => getMyVendor(supabase),
  });

  if (editingId !== null && vendor) {
    return (
      <ProductForm
        vendorId={vendor.id}
        productId={editingId === "new" ? null : editingId}
        onBack={() => setEditingId(null)}
      />
    );
  }

  return <ProductsList vendorId={vendor?.id} onOpen={setEditingId} />;
}

function ProductsList({
  vendorId,
  onOpen,
}: {
  vendorId: string | undefined;
  onOpen: (id: string | "new") => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products", vendorId],
    queryFn: () => listMyProducts(supabase, vendorId!),
    enabled: !!vendorId,
  });

  const { data: vendorCategories } = useQuery({
    queryKey: ["vendor-categories", vendorId],
    queryFn: () => listVendorCategories(supabase, vendorId!),
    enabled: !!vendorId,
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, statusFilter, categoryFilter, search]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)),
    );
  }

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => bulkArchiveProducts(supabase, [id]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products", vendorId] });
      setPendingDeleteId(null);
    },
  });

  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkArchiveProducts(supabase, Array.from(selected)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products", vendorId] });
      setSelected(new Set());
      setBulkDeleteConfirm(false);
    },
  });

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className="rounded-full px-[15px] py-2 text-[12.5px] font-bold"
            style={
              statusFilter === tab.value
                ? { background: "var(--color-primary)", color: "#fff", border: "1px solid var(--color-primary)" }
                : { background: "#fff", color: "var(--color-primary)", border: "1px solid var(--color-border)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-[18px] flex items-center gap-3">
        <input
          placeholder="Search your products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[300px] flex-1 rounded-lg border border-border px-[14px] py-[10px] text-[13px] outline-none focus:border-primary-light"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-border px-[14px] py-[10px] text-[13px] text-ink-dark"
        >
          <option value="">All categories</option>
          {vendorCategories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        {selected.size > 0 ? (
          <button
            type="button"
            onClick={() => setBulkDeleteConfirm(true)}
            className="rounded-lg border border-border bg-white px-[16px] py-[10px] text-[13px] font-bold text-danger"
          >
            Delete selected ({selected.size})
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onOpen("new")}
          className="rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white"
        >
          + Add product
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <div className="min-w-[680px]">
        <div className="grid grid-cols-[32px_2fr_1fr_1fr_1fr_150px] items-center bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleSelectAll}
          />
          <span>Product</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading products…</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-muted">No products yet.</p>
        ) : (
          filtered.map((p) => {
            const badge = STATUS_BADGE[p.status];
            const thumb = p.product_images?.[0]?.url;
            return (
              <div
                key={p.id}
                className="grid grid-cols-[32px_2fr_1fr_1fr_1fr_150px] items-center border-t border-[#F5F0EE] px-5 py-4"
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggleSelected(p.id)}
                />
                <div className="flex items-center gap-3">
                  <span
                    className="h-[38px] w-[38px] shrink-0 rounded-[7px] bg-cover bg-center"
                    style={{
                      background: thumb
                        ? `url(${thumb}) center/cover`
                        : "repeating-linear-gradient(135deg,#F3ECE8 0 6px,#E9DFD9 6px 12px)",
                    }}
                  />
                  <span className="line-clamp-1 text-[12.5px] text-ink-dark">{p.name}</span>
                </div>
                <span className="text-[13px] font-bold text-ink-dark">
                  Rs. {p.price.toLocaleString()}
                </span>
                <span
                  className="text-[12.5px]"
                  style={{ color: stockColor(p.stock_quantity, p.low_stock_threshold) }}
                >
                  {stockLabel(p.stock_quantity)}
                </span>
                <span>
                  <span
                    className="inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className="w-fit rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(p.id)}
                    className="w-fit rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Remove this product?"
        message="It will be archived and shoppers won't see it anymore."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDeleteId!)}
        onCancel={() => setPendingDeleteId(null)}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        title={`Remove ${selected.size} product${selected.size === 1 ? "" : "s"}?`}
        message="They'll be archived and shoppers won't see them anymore."
        confirmLabel="Delete selected"
        loading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate()}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
}

function ProductForm({
  vendorId,
  productId,
  onBack,
}: {
  vendorId: string;
  productId: string | null;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["vendor-categories", vendorId],
    queryFn: () => listVendorCategories(supabase, vendorId),
  });

  const { data: existing } = useQuery({
    queryKey: ["my-products", vendorId],
    queryFn: () => listMyProducts(supabase, vendorId),
  });
  const product = productId ? existing?.find((p) => p.id === productId) : null;

  const { data: existingExtraCategories } = useQuery({
    queryKey: ["product-categories", productId],
    queryFn: () => listProductCategories(supabase, productId!),
    enabled: !!productId,
  });

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [images, setImages] = useState<{ id: string; url: string; variantId: string | null }[]>(
    [],
  );
  const [variants, setVariants] = useState<
    { id: string; option_name: string; option_value: string; stock_quantity: number }[]
  >([]);
  const [variantOptionName, setVariantOptionName] = useState("Color");
  const [variantOptionValue, setVariantOptionValue] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [currentProductId, setCurrentProductId] = useState<string | null>(productId);
  const [brand, setBrand] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [weight, setWeight] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("15");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [has360, setHas360] = useState(false);
  const [frames360, setFrames360] = useState<Product360Row[]>([]);
  const [activeSet, setActiveSet] = useState<string | null>(null);
  const [error360, setError360] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setPrice(String(product.price));
    setCompareAtPrice(product.compare_at_price ? String(product.compare_at_price) : "");
    setStock(String(product.stock_quantity));
    setCategoryIds(new Set(product.category_id ? [product.category_id] : []));
    setDescription(product.description ?? "");
    setPublished(product.status === "published" || product.status === "pending");
    setImages(
      product.product_images.map((img) => ({
        id: img.id,
        url: img.url,
        variantId: img.variant_id,
      })),
    );
    setVariants(
      product.product_variants.map((v) => ({
        id: v.id,
        option_name: v.option_name,
        option_value: v.option_value,
        stock_quantity: v.stock_quantity,
      })),
    );
    setBrand(product.brand ?? "");
    setTagsInput((product.tags ?? []).join(", "));
    setWeight(product.weight_grams ? String(product.weight_grams) : "");
    setLowStockThreshold(String(product.low_stock_threshold ?? 15));
    setSeoTitle(product.seo_title ?? "");
    setSeoDescription(product.seo_description ?? "");
    setHas360(product.has_360_view);
    setFrames360(
      (product.product_360_images ?? []).map((i) => ({
        angleIndex: i.angle_index,
        url: i.url,
        variantId: i.variant_id,
      })),
    );
  }, [product]);

  useEffect(() => {
    if (!existingExtraCategories || !product) return;
    setCategoryIds((prev) => new Set([...prev, ...existingExtraCategories]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingExtraCategories]);

  function toggleCategory(id: string) {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── 360° sets, one per colour variant plus a shared fallback ─────────── */

  const colourVariants = variants.filter((v) =>
    ["color", "colour"].includes(v.option_name.toLowerCase()),
  );
  const sets360: Product360ColourSet[] = [
    { variantId: null, label: "All colours" },
    ...colourVariants.map((v) => ({ variantId: v.id, label: v.option_value })),
  ];
  const activeSetFrames = frames360
    .filter((f) => f.variantId === activeSet)
    .sort((a, b) => a.angleIndex - b.angleIndex);
  const frameCounts360 = frames360.reduce<Record<string, number>>((acc, f) => {
    const key = f.variantId ?? "__default__";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 360° is optional, but a set that's switched on needs enough frames to
      // actually spin — and every colour set that has photos must clear the bar.
      if (has360) {
        const populated = Object.entries(frameCounts360).filter(([, n]) => n > 0);
        if (populated.length === 0) {
          throw new Error(
            `Upload at least ${MIN_360_FRAMES} photos for the 360° view, or switch it off to save.`,
          );
        }
        if (populated.some(([, n]) => n < MIN_360_FRAMES)) {
          throw new Error(
            `Every 360° set needs at least ${MIN_360_FRAMES} photos — add more, or remove the incomplete set.`,
          );
        }
      }
      const categoryIdList = Array.from(categoryIds);
      const payload = {
        name,
        price: Number(price) || 0,
        compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
        stock_quantity: Number(stock) || 0,
        category_id: categoryIdList[0] ?? null,
        description,
        // Vendors submit for review, they don't publish directly: a brand-new
        // or previously-unpublished product that's toggled on goes to
        // 'pending' for admin approval (see the admin Products page); only
        // editing an already-published product keeps it live without a
        // fresh review.
        status: (!published
          ? "draft"
          : product?.status === "published"
            ? "published"
            : "pending") as ProductStatus,
        brand: brand || null,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        weight_grams: weight ? Number(weight) : null,
        low_stock_threshold: Number(lowStockThreshold) || 15,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        has_360_view: has360,
      };
      let savedId = currentProductId;
      if (currentProductId) {
        await updateProduct(supabase, currentProductId, payload);
      } else {
        const created = await createProduct(supabase, {
          vendor_id: vendorId,
          slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
          ...payload,
        });
        savedId = created.id;
        setCurrentProductId(created.id);
      }
      // Extra categories beyond the primary one (category_id already covers
      // the first). Only the remainder needs the junction table.
      await setProductCategories(supabase, savedId!, categoryIdList.slice(1));
      return savedId;
    },
    onSuccess: () => {
      setError360(null);
      queryClient.invalidateQueries({ queryKey: ["my-products", vendorId] });
      onBack();
    },
    onError: (err: Error) => setError360(err.message),
  });

  const add360FramesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!currentProductId) throw new Error("Save the product before adding 360° photos.");
      // Frames append to the end of the set the vendor is currently editing.
      let nextIndex = activeSetFrames.reduce((max, f) => Math.max(max, f.angleIndex), 0) + 1;
      const done: Product360Row[] = [];
      for (const file of files) {
        if (nextIndex > MAX_360_FRAMES) break;
        const url = await upload360Image(supabase, currentProductId, nextIndex, file, activeSet);
        await set360Image(supabase, currentProductId, nextIndex, url, activeSet);
        done.push({ angleIndex: nextIndex, url, variantId: activeSet });
        nextIndex += 1;
      }
      return done;
    },
    onSuccess: (done) => {
      setFrames360((prev) => [...prev, ...done]);
      setError360(null);
    },
    onError: (err: Error) => setError360(err.message),
  });

  const remove360FrameMutation = useMutation({
    mutationFn: async (angleIndex: number) => {
      if (!currentProductId) throw new Error("Nothing to remove yet.");
      await remove360Image(supabase, currentProductId, angleIndex, activeSet);
      return angleIndex;
    },
    onSuccess: (angleIndex) => {
      setFrames360((prev) =>
        prev.filter((f) => !(f.angleIndex === angleIndex && f.variantId === activeSet)),
      );
    },
    onError: (err: Error) => setError360(err.message),
  });

  const clear360SetMutation = useMutation({
    mutationFn: async () => {
      if (!currentProductId) throw new Error("Nothing to remove yet.");
      await clear360Set(supabase, currentProductId, activeSet);
    },
    onSuccess: () => {
      setFrames360((prev) => prev.filter((f) => f.variantId !== activeSet));
    },
    onError: (err: Error) => setError360(err.message),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!currentProductId) throw new Error("Save the product before adding images.");
      const added: { id: string; url: string; variantId: string | null }[] = [];
      let sortOrder = images.filter((i) => i.variantId === imageSet).length;
      for (const file of files) {
        const url = await uploadProductImage(supabase, currentProductId, file);
        const row = await addProductImage(supabase, currentProductId, url, sortOrder, imageSet);
        added.push({ id: row.id, url: row.url, variantId: row.variant_id });
        sortOrder += 1;
      }
      return added;
    },
    onSuccess: (added) => {
      setImages((prev) => [...prev, ...added]);
      setImageError(null);
    },
    onError: (err: Error) => setImageError(err.message),
  });

  const addVariantMutation = useMutation({
    mutationFn: async () => {
      if (!currentProductId) throw new Error("Save the product before adding variants.");
      return createProductVariant(supabase, {
        product_id: currentProductId,
        option_name: variantOptionName.trim(),
        option_value: variantOptionValue.trim(),
        stock_quantity: Number(variantStock) || 0,
      });
    },
    onSuccess: (v) => {
      setVariants((prev) => [
        ...prev,
        {
          id: v.id,
          option_name: v.option_name,
          option_value: v.option_value,
          stock_quantity: v.stock_quantity,
        },
      ]);
      setVariantOptionValue("");
      setVariantStock("");
    },
  });

  const removeVariantMutation = useMutation({
    mutationFn: (id: string) => removeProductVariant(supabase, id),
    onSuccess: (_void, id) => {
      setVariants((prev) => prev.filter((v) => v.id !== id));
      setPendingDelete(null);
    },
  });

  const removeImageMutation = useMutation({
    mutationFn: (id: string) => removeProductImage(supabase, id),
    onSuccess: (_void, id) => {
      setImages((prev) => prev.filter((img) => img.id !== id));
      setPendingDelete(null);
    },
  });

  const [pendingDelete, setPendingDelete] = useState<
    { type: "image" | "variant"; id: string } | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  /** Which colour the photos being shown/uploaded belong to (null = all colours). */
  const [imageSet, setImageSet] = useState<string | null>(null);
  const shownImages = images.filter((i) => i.variantId === imageSet);

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) uploadMutation.mutate(files);
    e.target.value = "";
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-[12.5px] font-bold text-accent"
      >
        ← Back to products
      </button>

      <div className="grid max-w-[1000px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
          <FormField label="Product name">
            <input
              placeholder="e.g. Wireless Earbuds Pro 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <FormField label="Price">
              <input
                placeholder="Rs. 4,999"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </FormField>
            <FormField label="Original price (optional)">
              <input
                placeholder="e.g. 6,999 — shown crossed out"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </FormField>
            <FormField label="Stock quantity">
              <input
                placeholder="120"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </FormField>
          </div>
          {compareAtPrice && Number(compareAtPrice) > 0 && Number(compareAtPrice) <= Number(price || 0) ? (
            <p className="-mt-2 text-[11.5px] text-danger">
              The discount price should be higher than the selling price — enter the original
              price here.
            </p>
          ) : null}

          <FormField label={`Categories${categoryIds.size > 0 ? ` (${categoryIds.size} selected)` : ""}`}>
            {categories && categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const selected = categoryIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
                      style={
                        selected
                          ? { background: "var(--color-primary)", color: "#fff" }
                          : { background: "#fff", border: "1px solid var(--color-border)", color: "var(--color-ink-secondary)" }
                      }
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11.5px] text-danger">
                No categories are assigned to your store yet — contact an admin to get categories
                assigned before you can list products.
              </p>
            )}
            {categories && categories.length > 1 ? (
              <p className="text-[11px] text-muted">
                Pick as many as apply — your product will show up under all of them.
              </p>
            ) : null}
          </FormField>

          <FormField label="Description">
            <textarea
              rows={4}
              placeholder="Describe the product…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-y rounded-lg border border-border px-[13px] py-[11px] font-sans text-[13px] outline-none focus:border-primary-light"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3.5">
            <FormField label="Brand">
              <input
                placeholder="e.g. Anker"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </FormField>
            <FormField label="Tags">
              <input
                placeholder="e.g. wireless, bluetooth, audio"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <FormField label="Weight (grams)">
              <input
                placeholder="e.g. 250"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </FormField>
            <FormField label="Low-stock threshold">
              <input
                placeholder="15"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </FormField>
          </div>

          <FormField label="SEO title">
            <input
              placeholder="Shown as the page title in search results"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </FormField>

          <FormField label="SEO description">
            <textarea
              rows={2}
              placeholder="Shown as the page description in search results"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="resize-y rounded-lg border border-border px-[13px] py-[11px] font-sans text-[13px] outline-none focus:border-primary-light"
            />
          </FormField>

          <FormField label="Product images">
            {sets360.length > 1 ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {sets360.map((s) => {
                    const active = s.variantId === imageSet;
                    const n = images.filter((i) => i.variantId === s.variantId).length;
                    return (
                      <button
                        key={s.variantId ?? "__default__"}
                        type="button"
                        onClick={() => setImageSet(s.variantId)}
                        className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
                        style={
                          active
                            ? { background: "var(--color-primary)", color: "#fff" }
                            : {
                                background: "#fff",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-primary)",
                              }
                        }
                      >
                        {s.label}
                        <span className={active ? "ml-1.5 text-white/70" : "ml-1.5 text-muted-table"}>
                          {n}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-muted">
                  Photos added under a colour replace the main gallery when a shopper picks that
                  colour. &ldquo;All colours&rdquo; photos are the fallback.
                </span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2.5">
              {shownImages.map((img) => (
                <div key={img.id} className="group relative h-[88px] w-[88px]">
                  <div
                    className="h-full w-full rounded-[9px] bg-cover bg-center"
                    style={{ backgroundImage: `url(${img.url})` }}
                  />
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ type: "image", id: img.id })}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={uploadMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[9px] border-[1.5px] border-dashed border-border text-[11px] text-muted-table disabled:opacity-60"
              >
                {uploadMutation.isPending ? (
                  "Uploading…"
                ) : (
                  <>
                    <span>+ Upload</span>
                    <span className="text-[9.5px]">pick many</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </div>
            {!currentProductId ? (
              <p className="text-[12px] text-muted">
                Save the product first, then add images.
              </p>
            ) : null}
            {imageError ? (
              <p className="text-[12.5px] font-semibold text-danger">{imageError}</p>
            ) : null}
          </FormField>

          <Product360Uploader
            frames={activeSetFrames}
            sets={sets360}
            activeSetId={activeSet}
            onSelectSet={setActiveSet}
            frameCounts={frameCounts360}
            enabled={has360}
            onToggle={setHas360}
            onAddFrames={(files) => add360FramesMutation.mutate(files)}
            onRemoveFrame={(angleIndex) => remove360FrameMutation.mutate(angleIndex)}
            onClearSet={() => clear360SetMutation.mutate()}
            uploading={add360FramesMutation.isPending || clear360SetMutation.isPending}
            disabledReason={
              currentProductId ? undefined : "Save the product first, then add 360° photos."
            }
            error={error360}
          />

          <FormField label="Variants (e.g. Color, Size)">
            {!currentProductId ? (
              <p className="text-[12.5px] text-muted">Save the product first, then add variants.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {variants.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <span
                        key={v.id}
                        className="flex items-center gap-2 rounded-full border border-border bg-white py-1.5 pl-3 pr-2 text-[12.5px]"
                      >
                        {["color", "colour"].includes(v.option_name.toLowerCase()) ? (
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
                            style={{ background: v.option_value.toLowerCase() }}
                          />
                        ) : null}
                        <span className="text-muted">{v.option_name}:</span>
                        <span className="font-bold text-ink-dark">{v.option_value}</span>
                        <span className="text-muted-table">({v.stock_quantity})</span>
                        <button
                          type="button"
                          onClick={() => setPendingDelete({ type: "variant", id: v.id })}
                          className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-[1fr_1fr_90px_auto] items-end gap-2">
                  <FormField label="Option name">
                    <input
                      placeholder="Color"
                      value={variantOptionName}
                      onChange={(e) => setVariantOptionName(e.target.value)}
                      className="rounded-lg border border-border px-[11px] py-2 text-[13px] outline-none focus:border-primary-light"
                    />
                  </FormField>
                  <FormField label="Value">
                    <input
                      placeholder="e.g. Red"
                      value={variantOptionValue}
                      onChange={(e) => setVariantOptionValue(e.target.value)}
                      className="rounded-lg border border-border px-[11px] py-2 text-[13px] outline-none focus:border-primary-light"
                    />
                  </FormField>
                  <FormField label="Stock">
                    <input
                      placeholder="10"
                      value={variantStock}
                      onChange={(e) => setVariantStock(e.target.value)}
                      className="rounded-lg border border-border px-[11px] py-2 text-[13px] outline-none focus:border-primary-light"
                    />
                  </FormField>
                  <button
                    type="button"
                    disabled={
                      !variantOptionName.trim() || !variantOptionValue.trim() || addVariantMutation.isPending
                    }
                    onClick={() => addVariantMutation.mutate()}
                    className="h-[38px] rounded-lg bg-accent px-4 text-[12.5px] font-bold text-white disabled:opacity-60"
                  >
                    + Add
                  </button>
                </div>
              </div>
            )}
          </FormField>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-[13px] font-bold text-ink">Visibility</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] text-ink-dark">
                {published
                  ? product?.status === "published"
                    ? "Live"
                    : "Submitted for review"
                  : "Draft"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={published}
                onClick={() => setPublished((v) => !v)}
                className="flex h-5 w-[38px] items-center rounded-full p-[2px]"
                style={{
                  background: published ? "var(--color-accent)" : "var(--color-border)",
                  justifyContent: published ? "flex-end" : "flex-start",
                }}
              >
                <span className="h-4 w-4 rounded-full bg-white" />
              </button>
            </div>
            {published && product?.status !== "published" ? (
              <p className="mt-2 text-[11.5px] text-muted">
                An admin needs to approve this before it shows on the storefront.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-[10px] bg-accent px-3 py-[13px] text-sm font-bold text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving…" : "Save product"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-[10px] border border-border bg-white px-3 py-3 text-[13.5px] font-bold text-primary"
          >
            Cancel
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={pendingDelete?.type === "image" ? "Remove this image?" : "Remove this variant?"}
        confirmLabel="Remove"
        loading={removeImageMutation.isPending || removeVariantMutation.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.type === "image") removeImageMutation.mutate(pendingDelete.id);
          else removeVariantMutation.mutate(pendingDelete.id);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[7px]">
      <span className="text-[12.5px] font-bold text-ink-dark">{label}</span>
      {children}
    </div>
  );
}
