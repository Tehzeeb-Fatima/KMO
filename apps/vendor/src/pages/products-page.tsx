import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addProductImage,
  bulkArchiveProducts,
  createProduct,
  createProductVariant,
  getMyVendor,
  listCategories,
  listMyProducts,
  listVendorCategories,
  removeProductImage,
  removeProductVariant,
  updateProduct,
  uploadProductImage,
} from "@kmo/shared/api";
import type { ProductStatus } from "@kmo/shared/types";
import { categoryPath } from "@kmo/shared/lib";
import { ConfirmDialog } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

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

/** Empty box = stock not tracked (null): always available, never "Out of stock". */
function parseStock(input: string): number | null {
  return input.trim() === "" ? null : Math.max(0, Number(input) || 0);
}

function stockColor(stock: number | null, threshold: number) {
  if (stock === null) return "var(--color-success)";
  if (stock <= 0) return "var(--color-danger)";
  if (stock <= threshold) return "var(--color-warning)";
  return "var(--color-success)";
}

function stockLabel(stock: number | null) {
  if (stock === null) return "Available";
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

  const { data: allCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const parentOf = new Map((allCategories ?? []).map((c) => [c.id, c.parent_id]));
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (
        categoryFilter &&
        p.category_id !== categoryFilter &&
        parentOf.get(p.category_id ?? "") !== categoryFilter
      ) {
        return false;
      }
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, allCategories, statusFilter, categoryFilter, search]);

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
      <button
        type="button"
        onClick={() => onOpen("new")}
        className="mb-4 w-full rounded-lg bg-accent px-[18px] py-3 text-[14px] font-bold text-white sm:hidden"
      >
        + Add product
      </button>

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

      <div className="mb-[18px] flex flex-wrap items-center gap-2.5 sm:gap-3">
        <input
          placeholder="Search your products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border px-[14px] py-[10px] text-[13px] outline-none focus:border-primary-light sm:w-auto sm:max-w-[300px] sm:flex-1"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border px-[14px] py-[10px] text-[13px] text-ink-dark sm:flex-none"
        >
          <option value="">All categories</option>
          {vendorCategories?.map((c) => [
            <option key={c.id} value={c.id}>
              {c.name}
            </option>,
            ...(allCategories ?? [])
              .filter((sub) => sub.parent_id === c.id)
              .map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {"   ↳ "}
                  {sub.name}
                </option>
              )),
          ])}
        </select>
        <div className="hidden flex-1 sm:block" />
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
          className="hidden rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white sm:block"
        >
          + Add product
        </button>
      </div>

      {/* phones: one card per product */}
      <div className="flex flex-col gap-3 sm:hidden">
        {isLoading ? (
          <p className="text-sm text-muted">Loading products…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No products yet — tap &ldquo;+ Add product&rdquo; to list your first one.
          </p>
        ) : (
          filtered.map((p) => {
            const badge = STATUS_BADGE[p.status];
            const thumb = p.product_images?.[0]?.url;
            return (
              <div key={p.id} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
                <span
                  className="h-[72px] w-[72px] shrink-0 rounded-lg bg-cover bg-center"
                  style={{
                    background: thumb
                      ? `url(${thumb}) center/cover`
                      : "repeating-linear-gradient(135deg,#F3ECE8 0 6px,#E9DFD9 6px 12px)",
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="line-clamp-2 text-[13.5px] font-semibold text-ink-dark">{p.name}</span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
                    <span className="font-bold text-ink-dark">Rs. {p.price.toLocaleString()}</span>
                    <span style={{ color: stockColor(p.stock_quantity, p.low_stock_threshold) }}>
                      {stockLabel(p.stock_quantity)}
                    </span>
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(p.id)}
                      className="rounded-md border border-border bg-white px-3.5 py-1.5 text-[12px] font-bold text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(p.id)}
                      className="rounded-md border border-border bg-white px-3.5 py-1.5 text-[12px] font-bold text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface sm:block">
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

type FormImage = { key: string; url: string; id?: string; file?: File };
type FormVariant = { key: string; option_name: string; option_value: string; stock_quantity: number | null; id?: string };

const VARIANT_TYPES = ["Size", "Colour", "Other"] as const;
const inputClass =
  "w-full rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light";

/**
 * One-page product form for vendors. Photos and sizes/colours can be added
 * before the product exists — they're held in the form and written on Save,
 * so a vendor never has to "save first, then come back".
 */
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

  const { data: allCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });

  // Each category assigned to this store, with the sub-categories under it
  // (e.g. Women's Fashion → Lingerie, Kurtis, ...). The vendor taps one.
  const categoryGroups = useMemo(
    () =>
      (categories ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((parent) => ({
          parent,
          children: parent.parent_id
            ? []
            : (allCategories ?? [])
                .filter((c) => c.parent_id === parent.id)
                .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
        })),
    [categories, allCategories],
  );

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionUr, setDescriptionUr] = useState("");
  const [published, setPublished] = useState(true);
  const [images, setImages] = useState<FormImage[]>([]);
  const [variants, setVariants] = useState<FormVariant[]>([]);
  const [brand, setBrand] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [weight, setWeight] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("15");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [showMore, setShowMore] = useState(false);

  // Images/variants removed from an existing product; deleted on Save.
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);

  const [variantType, setVariantType] = useState<(typeof VARIANT_TYPES)[number]>("Size");
  const [customType, setCustomType] = useState("");
  const [variantValue, setVariantValue] = useState("");
  const [variantQty, setVariantQty] = useState("");

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setPrice(String(product.price));
    setCompareAtPrice(product.compare_at_price ? String(product.compare_at_price) : "");
    setStock(product.stock_quantity === null ? "" : String(product.stock_quantity));
    setCategoryId(product.category_id ?? "");
    setDescription(product.description ?? "");
    setDescriptionUr(product.description_ur ?? "");
    setPublished(product.status === "published" || product.status === "pending");
    setImages(
      product.product_images
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img) => ({ key: img.id, id: img.id, url: img.url })),
    );
    setVariants(
      product.product_variants.map((v) => ({
        key: v.id,
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
  }, [product]);

  // Free the local previews of photos picked but not saved.
  useEffect(
    () => () => {
      images.forEach((img) => img.file && URL.revokeObjectURL(img.url));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  function handlePickPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setImages((prev) => [
      ...prev,
      ...files.map((file) => ({ key: crypto.randomUUID(), url: URL.createObjectURL(file), file })),
    ]);
  }
  function removeImage(img: FormImage) {
    if (img.id) setRemovedImageIds((prev) => [...prev, img.id!]);
    if (img.file) URL.revokeObjectURL(img.url);
    setImages((prev) => prev.filter((i) => i.key !== img.key));
  }
  function makeMainPhoto(img: FormImage) {
    setImages((prev) => [img, ...prev.filter((i) => i.key !== img.key)]);
  }

  const optionName = variantType === "Other" ? customType.trim() : variantType;
  const canAddVariant = !!optionName && !!variantValue.trim();
  function addVariant() {
    if (!canAddVariant) return;
    setVariants((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        option_name: optionName,
        option_value: variantValue.trim(),
        stock_quantity: parseStock(variantQty),
      },
    ]);
    setVariantValue("");
    setVariantQty("");
  }
  function removeVariant(v: FormVariant) {
    if (v.id) setRemovedVariantIds((prev) => [...prev, v.id!]);
    setVariants((prev) => prev.filter((x) => x.key !== v.key));
  }

  // With sizes/colours, total stock is the sum of their quantities, or
  // untracked (null) if any of them has no quantity.
  const variantStockTotal = variants.some((v) => v.stock_quantity === null)
    ? null
    : variants.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0);
  const hasVariants = variants.length > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Enter a product name.");
      if (!categoryId) throw new Error("Pick a category.");
      if (!(Number(price) > 0)) throw new Error("Enter a price greater than 0.");
      if (compareAtPrice && Number(compareAtPrice) > 0 && Number(compareAtPrice) <= Number(price)) {
        throw new Error("Original price must be higher than the selling price, or leave it empty.");
      }
      if (images.length === 0) throw new Error("Add at least one photo.");

      const payload = {
        name: name.trim(),
        price: Number(price) || 0,
        compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
        stock_quantity: hasVariants ? variantStockTotal : parseStock(stock),
        category_id: categoryId,
        description,
        description_ur: descriptionUr.trim() || null,
        // Vendors submit for review: new or unpublished products go to
        // 'pending' for admin approval; an already-live product stays live.
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
      };

      let id = productId;
      if (id) {
        await updateProduct(supabase, id, payload);
      } else {
        const created = await createProduct(supabase, {
          vendor_id: vendorId,
          slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
          ...payload,
        });
        id = created.id;
      }

      for (const imageId of removedImageIds) await removeProductImage(supabase, imageId);
      for (const variantId of removedVariantIds) await removeProductVariant(supabase, variantId);

      // Photos in on-screen order; the first one is the main photo.
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.file) {
          const url = await uploadProductImage(supabase, id, img.file);
          await addProductImage(supabase, id, url, i, null);
        } else if (img.id) {
          await supabase.from("product_images").update({ sort_order: i }).eq("id", img.id);
        }
      }
      for (const v of variants) {
        if (!v.id) {
          await createProductVariant(supabase, {
            product_id: id,
            option_name: v.option_name,
            option_value: v.option_value,
            stock_quantity: v.stock_quantity,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products", vendorId] });
      onBack();
    },
  });

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 text-[12.5px] font-bold text-accent">
        ← Back to products
      </button>

      <div className="grid max-w-[1000px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          {/* 1. basics */}
          <Section title="1. Product details">
            <FormField label="Product name">
              <input
                placeholder="e.g. Men's cotton T-shirt"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </FormField>

            <FormField label="Category">
              {categoryGroups.length > 0 ? (
                <div className="flex flex-col gap-3.5">
                  <p className="text-[12px] text-muted">Tap the one that fits your product best.</p>
                  {categoryGroups.map((g) => (
                    <div key={g.parent.id}>
                      {g.children.length > 0 ? (
                        <p className="mb-2 text-[12.5px] font-bold text-ink-dark">{g.parent.name}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {[
                          ...g.children.map((c) => ({ id: c.id, label: c.name })),
                          {
                            id: g.parent.id,
                            label: g.children.length > 0 ? `Other ${g.parent.name}` : g.parent.name,
                          },
                        ].map((c) => {
                          const selected = categoryId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setCategoryId(c.id)}
                              className="rounded-full px-3.5 py-2 text-[12.5px] font-semibold"
                              style={
                                selected
                                  ? { background: "var(--color-primary)", color: "#fff" }
                                  : { background: "#fff", border: "1px solid var(--color-border)", color: "var(--color-ink-secondary)" }
                              }
                            >
                              {selected ? "✓ " : ""}
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {categoryId && allCategories ? (
                    <p className="text-[12px] font-semibold text-success-dark">
                      Selected: {categoryPath(allCategories, categoryId)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[12px] text-danger">
                  No categories are assigned to your store yet — please contact the KMO team.
                </p>
              )}
            </FormField>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FormField label="Selling price (Rs.)">
                <input
                  inputMode="numeric"
                  placeholder="e.g. 1500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Original price (optional)">
                <input
                  inputMode="numeric"
                  placeholder="e.g. 2000 — shown crossed out"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea
                rows={4}
                placeholder="Material, size guide, what's in the box…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} resize-y font-sans`}
              />
            </FormField>

            <FormField label="Description in Urdu (optional)">
              <textarea
                rows={3}
                dir="rtl"
                placeholder="اردو میں تفصیل — ویب سائٹ اردو میں ہو تو یہ دکھے گی"
                value={descriptionUr}
                onChange={(e) => setDescriptionUr(e.target.value)}
                className={`${inputClass} resize-y font-sans`}
              />
            </FormField>
          </Section>

          {/* 2. photos */}
          <Section title="2. Photos" hint="Add clear photos. The first photo is the main one shoppers see.">
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={img.key} className="relative h-[110px] w-[110px]">
                  <div
                    className="h-full w-full rounded-[10px] border border-border bg-surface-alt bg-cover bg-center"
                    style={{ backgroundImage: `url(${img.url})` }}
                  />
                  {i === 0 ? (
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Main
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makeMainPhoto(img)}
                      className="absolute bottom-1.5 left-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                    >
                      Make main
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removeImage(img)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-[12px] font-bold text-white shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[110px] w-[110px] flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-dashed border-primary-light text-primary hover:bg-primary-tint"
              >
                <span className="text-[26px] leading-none">+</span>
                <span className="text-[12px] font-bold">Add photos</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handlePickPhotos}
              />
            </div>
          </Section>

          {/* 3. sizes & colours */}
          <Section
            title="3. Sizes & colours (optional)"
            hint="Does this product come in different sizes or colours? Add each one with how many you have."
          >
            {hasVariants ? (
              <div className="flex flex-col divide-y divide-[#F1EAE6] rounded-lg border border-border">
                {variants.map((v) => (
                  <div key={v.key} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                    <span className="w-[70px] shrink-0 text-muted">{v.option_name}</span>
                    <span className="flex-1 font-bold text-ink-dark">{v.option_value}</span>
                    <span className="text-muted">{stockLabel(v.stock_quantity)}</span>
                    <button
                      type="button"
                      onClick={() => removeVariant(v)}
                      className="text-[12px] font-bold text-danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-2.5 rounded-lg bg-surface-alt p-3.5">
              <div className="flex flex-wrap gap-2">
                {VARIANT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setVariantType(t)}
                    className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
                    style={
                      variantType === t
                        ? { background: "var(--color-primary)", color: "#fff" }
                        : { background: "#fff", border: "1px solid var(--color-border)", color: "var(--color-ink-secondary)" }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_110px_auto] sm:items-end">
                {variantType === "Other" ? (
                  <input
                    placeholder="Type, e.g. Material"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className={inputClass}
                  />
                ) : null}
                <input
                  placeholder={variantType === "Colour" ? "e.g. Black" : variantType === "Size" ? "e.g. Medium" : "e.g. Cotton"}
                  value={variantValue}
                  onChange={(e) => setVariantValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addVariant();
                    }
                  }}
                  className={`${inputClass} ${variantType === "Other" ? "" : "sm:col-span-2"}`}
                />
                <input
                  inputMode="numeric"
                  placeholder="Quantity (optional)"
                  value={variantQty}
                  onChange={(e) => setVariantQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addVariant();
                    }
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={!canAddVariant}
                  onClick={addVariant}
                  className="h-[44px] rounded-lg bg-accent px-5 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  + Add
                </button>
              </div>
            </div>
          </Section>

          {/* 4. stock */}
          <Section title="4. Stock (optional)">
            {hasVariants ? (
              <p className="text-[13px] text-ink-dark">
                Total in stock:{" "}
                <span className="font-bold">{variantStockTotal === null ? "Not counted" : variantStockTotal}</span>
                <span className="text-muted"> — added up from your sizes &amp; colours.</span>
              </p>
            ) : (
              <FormField label="How many do you have? (optional)">
                <input
                  inputMode="numeric"
                  placeholder="Leave empty if you don't count stock"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={`${inputClass} max-w-[300px]`}
                />
                <span className="text-[12px] text-muted">
                  Empty = always available. Fill it in if you want orders to stop when it runs out.
                </span>
              </FormField>
            )}
          </Section>

          {/* 5. extras */}
          <div className="rounded-xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-[14px] font-bold text-ink">More details (optional)</span>
              <span className="text-[12.5px] font-bold text-primary">{showMore ? "Hide" : "Show"}</span>
            </button>
            {showMore ? (
              <div className="flex flex-col gap-3.5 border-t border-border px-6 py-5">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <FormField label="Brand">
                    <input placeholder="e.g. Anker" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField label="Search tags">
                    <input
                      placeholder="e.g. summer, cotton, casual"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="Weight (grams)">
                    <input inputMode="numeric" placeholder="e.g. 250" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField label="Warn me when stock falls below">
                    <input
                      inputMode="numeric"
                      placeholder="15"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      className={inputClass}
                    />
                  </FormField>
                </div>
                <FormField label="SEO title">
                  <input
                    placeholder="Title shown in Google results"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="SEO description">
                  <textarea
                    rows={2}
                    placeholder="Short description shown in Google results"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className={`${inputClass} resize-y font-sans`}
                  />
                </FormField>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-[13px] font-bold text-ink">Visibility</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] text-ink-dark">
                {published
                  ? product?.status === "published"
                    ? "Live on the website"
                    : "Send for approval"
                  : "Save as draft"}
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
            <p className="mt-2 text-[11.5px] text-muted">
              {published && product?.status !== "published"
                ? "The KMO team checks every new product before it appears on the website."
                : !published
                  ? "Drafts are only visible to you."
                  : "Changes show on the website right away."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-[10px] bg-accent px-3 py-[14px] text-[15px] font-bold text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving…" : "Save product"}
          </button>
          {saveMutation.isError ? (
            <p className="text-[12.5px] font-semibold text-danger">{saveMutation.error.message}</p>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            className="rounded-[10px] border border-border bg-white px-3 py-3 text-[13.5px] font-bold text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-bold text-ink">{title}</p>
        {hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
      </div>
      {children}
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
