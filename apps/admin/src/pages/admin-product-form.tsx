import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addProductImage,
  createProduct,
  createProductVariant,
  listCategories,
  listProductCategories,
  listVendorCategories,
  listVendors,
  removeProductImage,
  removeProductVariant,
  setProductCategories,
  updateProduct,
  uploadProductImage,
  type ProductWithMedia,
} from "@kmo/shared/api";
import type { ProductStatus } from "@kmo/shared/types";
import { ConfirmDialog } from "@kmo/shared/ui";

type PhotoSet = { variantId: string | null; label: string };
import { supabase } from "../lib/supabase";

/**
 * Admin's own "add/edit product" form. Unlike the vendor dashboard's
 * version, the vendor is a field the admin picks (not implied by who's
 * logged in), the category list is scoped to whichever vendor is
 * currently selected, and publishing goes live immediately instead of
 * going to 'pending' - an admin-authored listing doesn't need to review
 * itself.
 */
export function AdminProductForm({
  product,
  onBack,
}: {
  product: ProductWithMedia | null;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();

  useEffect(
    () => () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    [queryClient],
  );

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-for-form"],
    queryFn: () => listVendors(supabase, { status: "approved" }),
  });

  const [vendorId, setVendorId] = useState(product?.vendor_id ?? "");

  const { data: categories } = useQuery({
    queryKey: ["vendor-categories", vendorId],
    queryFn: () => listVendorCategories(supabase, vendorId),
    enabled: !!vendorId,
  });

  const { data: allCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });

  // The vendor's assigned categories, each with its sub-categories.
  const categoryGroups = (categories ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((parent) => ({
      parent,
      children: parent.parent_id
        ? []
        : (allCategories ?? [])
            .filter((c) => c.parent_id === parent.id)
            .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    }));
  const pickableIds = categoryGroups.flatMap((g) => [g.parent.id, ...g.children.map((c) => c.id)]);

  const { data: existingExtraCategories } = useQuery({
    queryKey: ["product-categories", product?.id],
    queryFn: () => listProductCategories(supabase, product!.id),
    enabled: !!product,
  });

  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compare_at_price ? String(product.compare_at_price) : "",
  );
  const [stock, setStock] = useState(product?.stock_quantity != null ? String(product.stock_quantity) : "");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(
    new Set(product?.category_id ? [product.category_id] : []),
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [descriptionUr, setDescriptionUr] = useState(product?.description_ur ?? "");
  const [published, setPublished] = useState(product?.status === "published");
  const [images, setImages] = useState<{ id: string; url: string; variantId: string | null }[]>(
    product?.product_images.map((img) => ({
      id: img.id,
      url: img.url,
      variantId: img.variant_id,
    })) ?? [],
  );
  const [variants, setVariants] = useState(
    product?.product_variants.map((v) => ({
      id: v.id,
      option_name: v.option_name,
      option_value: v.option_value,
      stock_quantity: v.stock_quantity,
    })) ?? [],
  );
  const [variantOptionName, setVariantOptionName] = useState("Color");
  const [variantOptionValue, setVariantOptionValue] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [currentProductId, setCurrentProductId] = useState<string | null>(product?.id ?? null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Switching vendors mid-form invalidates whatever categories were picked
  // for the previous vendor.
  useEffect(() => {
    if (!categories || !allCategories) return;
    setCategoryIds((prev) => {
      const validIds = new Set(pickableIds);
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, allCategories]);

  useEffect(() => {
    if (!existingExtraCategories) return;
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

  /* ── photo sets, one per colour variant plus a shared fallback ────────── */

  const colourVariants = variants.filter((v) =>
    ["color", "colour"].includes(v.option_name.toLowerCase()),
  );
  const sets360: PhotoSet[] = [
    { variantId: null, label: "All colours" },
    ...colourVariants.map((v) => ({ variantId: v.id, label: v.option_value })),
  ];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!vendorId) throw new Error("Choose a vendor first.");
      if (!name.trim()) throw new Error("Enter a product name.");
      if (!(Number(price) > 0)) throw new Error("Enter a price greater than 0.");
      if (categoryIds.size === 0) throw new Error("Pick at least one category.");
      const categoryIdList = Array.from(categoryIds);
      const payload = {
        name,
        price: Number(price) || 0,
        compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
        // empty = stock not tracked (always available)
        stock_quantity: stock.trim() === "" ? null : Number(stock) || 0,
        category_id: categoryIdList[0] ?? null,
        description,
        description_ur: descriptionUr.trim() || null,
        status: (published ? "published" : "draft") as ProductStatus,
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
      await setProductCategories(supabase, savedId!, categoryIdList.slice(1));
      return { wasNew: !currentProductId };
    },
    onSuccess: ({ wasNew }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      // A new product stays open so images and variants can be added to it.
      if (wasNew) setSavedNotice("Product saved — now add images and variants below, then save again.");
      else onBack();
    },
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

  const removeImageMutation = useMutation({
    mutationFn: (id: string) => removeProductImage(supabase, id),
    onSuccess: (_void, id) => {
      setImages((prev) => prev.filter((img) => img.id !== id));
      setPendingDelete(null);
    },
  });

  const addVariantMutation = useMutation({
    mutationFn: async () => {
      if (!currentProductId) throw new Error("Save the product before adding variants.");
      return createProductVariant(supabase, {
        product_id: currentProductId,
        option_name: variantOptionName.trim(),
        option_value: variantOptionValue.trim(),
        stock_quantity: variantStock.trim() === "" ? null : Number(variantStock) || 0,
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
      <button type="button" onClick={onBack} className="mb-4 text-[12.5px] font-bold text-accent">
        ← Back to products
      </button>

      <div className="grid max-w-[1000px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
          <FormField label="Vendor">
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              disabled={!!product}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] text-ink-dark outline-none disabled:bg-surface-alt disabled:text-muted"
            >
              <option value="">Select a vendor</option>
              {vendors?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.store_name}
                </option>
              ))}
            </select>
          </FormField>

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
            <FormField label="Stock quantity (optional)">
              <input
                placeholder="Empty = always available"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
              />
            </FormField>
          </div>

          <FormField label={`Categories${categoryIds.size > 0 ? ` (${categoryIds.size} selected)` : ""}`}>
            {!vendorId ? (
              <p className="text-[11.5px] text-muted">Choose a vendor first.</p>
            ) : categories && categories.length > 0 ? (
              <>
                <div className="flex flex-col gap-3">
                  {categoryGroups.map((g) => (
                    <div key={g.parent.id}>
                      {g.children.length > 0 ? (
                        <p className="mb-1.5 text-[12px] font-bold text-ink-dark">{g.parent.name}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {[
                          ...g.children.map((c) => ({ id: c.id, label: c.name })),
                          {
                            id: g.parent.id,
                            label: g.children.length > 0 ? `Other ${g.parent.name}` : g.parent.name,
                          },
                        ].map((c) => {
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
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted">
                  The first one picked is the main category; pick more if the product fits several.
                </p>
              </>
            ) : (
              <p className="text-[11.5px] text-danger">
                This vendor has no assigned categories yet — assign one from the vendor's detail
                page first.
              </p>
            )}
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

          <FormField label="Description in Urdu (optional)">
            <textarea
              rows={3}
              dir="rtl"
              placeholder="اردو میں تفصیل"
              value={descriptionUr}
              onChange={(e) => setDescriptionUr(e.target.value)}
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
              <p className="text-[12px] text-muted">Save the product first, then add images.</p>
            ) : null}
            {imageError ? (
              <p className="text-[12.5px] font-semibold text-danger">{imageError}</p>
            ) : null}
          </FormField>

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
                        <span className="text-muted-table">({v.stock_quantity ?? "not counted"})</span>
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

                <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_90px_auto]">
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
                      placeholder="Optional"
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
              <span className="text-[13px] text-ink-dark">{published ? "Live" : "Draft"}</span>
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
              Products you add go live immediately — no separate review step for admin-created
              listings.
            </p>
          </div>

          {saveMutation.isError ? (
            <p className="text-[12.5px] text-danger">{(saveMutation.error as Error).message}</p>
          ) : null}

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !vendorId || !name.trim()}
            className="rounded-[10px] bg-accent px-3 py-[13px] text-sm font-bold text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving…" : "Save product"}
          </button>
          {saveMutation.isError ? (
            <p className="text-[12.5px] font-semibold text-danger">{saveMutation.error.message}</p>
          ) : null}
          {savedNotice && !saveMutation.isError ? (
            <p className="text-[12.5px] font-semibold text-success">{savedNotice}</p>
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
