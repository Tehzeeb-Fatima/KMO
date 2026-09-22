import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkArchiveProducts,
  listAllProductsForModeration,
  listVendors,
  logAdminAction,
  notifyUser,
  updateProduct,
  type ProductWithMedia,
} from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";
import { AdminProductForm } from "./admin-product-form";

export function ProductsModerationPage() {
  const [pendingOnly, setPendingOnly] = useState(false);
  const [vendorFilter, setVendorFilter] = useState("");
  const [editing, setEditing] = useState<ProductWithMedia | null | "new">(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products", pendingOnly],
    queryFn: () => listAllProductsForModeration(supabase, pendingOnly),
  });

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-for-filter"],
    queryFn: () => listVendors(supabase),
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!vendorFilter) return products;
    return products.filter((p) => p.vendor_id === vendorFilter);
  }, [products, vendorFilter]);

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

  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "published" | "rejected" | "archived" }) =>
      updateProduct(supabase, id, { status: status === "rejected" ? "archived" : status }),
    onSuccess: async (_updated, { id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      if (user) void logAdminAction(supabase, user.id, `product.${status}`, "product", id);
      const product = products?.find((p) => p.id === id);
      if (product?.vendors?.owner_id && (status === "published" || status === "rejected")) {
        await notifyUser(supabase, product.vendors.owner_id, {
          type: "product_review",
          title:
            status === "published"
              ? `Product approved: ${product.name}`
              : `Product rejected: ${product.name}`,
          body:
            status === "published"
              ? "Your product is now live on the storefront."
              : "Your product was not approved — check it in your Products page.",
          link: "/products",
        });
      }
      setPendingRemoveId(null);
    },
  });

  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkArchiveProducts(supabase, Array.from(selected)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      if (user) {
        void logAdminAction(
          supabase,
          user.id,
          `product.bulk_archive.${selected.size}`,
          "product",
          Array.from(selected)[0] ?? "",
        );
      }
      setSelected(new Set());
      setBulkDeleteConfirm(false);
    },
  });

  if (editing !== null) {
    return (
      <AdminProductForm
        product={editing === "new" ? null : editing}
        onBack={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex w-fit items-center gap-2 text-[13px] text-ink-dark">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          Flagged only
        </label>
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="rounded-lg border border-border px-[14px] py-[10px] text-[13px] text-ink-dark"
        >
          <option value="">All vendors</option>
          {vendors?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.store_name}
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
          onClick={() => setEditing("new")}
          className="rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white"
        >
          + Add product
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <div className="min-w-[700px]">
        <div className="grid grid-cols-[32px_2fr_1fr_1fr_1fr_140px] items-center bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleSelectAll}
          />
          <span>Product</span>
          <span>Vendor</span>
          <span>Price</span>
          <span>Status</span>
          <span />
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-muted">No products to review.</p>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[32px_2fr_1fr_1fr_1fr_140px] items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleSelected(p.id)}
              />
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="truncate text-left font-bold text-ink-dark hover:text-primary"
              >
                {p.name}
              </button>
              <span className="text-muted">{p.vendors?.store_name}</span>
              <span className="text-ink-dark">Rs. {p.price.toLocaleString()}</span>
              <span className="text-muted">{p.status}</span>
              {p.status === "pending" ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => mutation.mutate({ id: p.id, status: "published" })}
                    className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => mutation.mutate({ id: p.id, status: "rejected" })}
                    className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingRemoveId(p.id)}
                  className="w-fit rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingRemoveId}
        title="Remove this product from the storefront?"
        message="It will be archived and shoppers won't see it anymore. You can restore it later from moderation."
        confirmLabel="Remove"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: pendingRemoveId!, status: "archived" })}
        onCancel={() => setPendingRemoveId(null)}
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
