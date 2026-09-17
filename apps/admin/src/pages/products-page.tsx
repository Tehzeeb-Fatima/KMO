import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllProductsForModeration, logAdminAction, updateProduct } from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function ProductsModerationPage() {
  const [pendingOnly, setPendingOnly] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products", pendingOnly],
    queryFn: () => listAllProductsForModeration(supabase, pendingOnly),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "published" | "rejected" | "archived" }) =>
      updateProduct(supabase, id, { status: status === "rejected" ? "archived" : status }),
    onSuccess: (_updated, { id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      if (user) void logAdminAction(supabase, user.id, `product.${status}`, "product", id);
    },
  });

  return (
    <div>
      <label className="mb-4 flex w-fit items-center gap-2 text-[13px] text-ink-dark">
        <input
          type="checkbox"
          checked={pendingOnly}
          onChange={(e) => setPendingOnly(e.target.checked)}
        />
        Flagged only
      </label>

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
        ) : !products || products.length === 0 ? (
          <p className="p-5 text-sm text-muted">No products to review.</p>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_140px] items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]"
            >
              <span className="font-bold text-ink-dark">{p.name}</span>
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
                  onClick={() => mutation.mutate({ id: p.id, status: "archived" })}
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
  );
}
