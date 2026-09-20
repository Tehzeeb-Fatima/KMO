import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAllProductsForModeration,
  listVendors,
  logAdminAction,
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

  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "published" | "rejected" | "archived" }) =>
      updateProduct(supabase, id, { status: status === "rejected" ? "archived" : status }),
    onSuccess: (_updated, { id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      if (user) void logAdminAction(supabase, user.id, `product.${status}`, "product", id);
      setPendingRemoveId(null);
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
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white"
        >
          + Add product
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_140px] bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
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
              className="grid grid-cols-[2fr_1fr_1fr_1fr_140px] items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]"
            >
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

      <ConfirmDialog
        open={!!pendingRemoveId}
        title="Remove this product from the storefront?"
        message="It will be archived and shoppers won't see it anymore. You can restore it later from moderation."
        confirmLabel="Remove"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate({ id: pendingRemoveId!, status: "archived" })}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}
