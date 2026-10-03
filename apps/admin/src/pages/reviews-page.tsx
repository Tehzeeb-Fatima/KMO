import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  keepReview,
  listFlaggedReviews,
  listVendors,
  logAdminAction,
  removeReview,
} from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [vendorFilter, setVendorFilter] = useState("");
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["flagged-reviews"],
    queryFn: () => listFlaggedReviews(supabase),
  });
  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-for-filter"],
    queryFn: () => listVendors(supabase),
  });

  const filtered = useMemo(() => {
    if (!reviews) return [];
    if (!vendorFilter) return reviews;
    return reviews.filter((r) => r.products.vendor_id === vendorFilter);
  }, [reviews, vendorFilter]);

  const keepMutation = useMutation({
    mutationFn: (id: string) => keepReview(supabase, id),
    onSuccess: (_v, id) => {
      queryClient.invalidateQueries({ queryKey: ["flagged-reviews"] });
      if (user) void logAdminAction(supabase, user.id, "review.keep", "review", id);
    },
  });
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const removeMutation = useMutation({
    mutationFn: (id: string) => removeReview(supabase, id),
    onSuccess: (_v, id) => {
      queryClient.invalidateQueries({ queryKey: ["flagged-reviews"] });
      if (user) void logAdminAction(supabase, user.id, "review.remove", "review", id);
      setPendingRemoveId(null);
    },
  });

  if (isLoading) return <p className="text-sm text-muted">Loading…</p>;

  const vendorSelect = (
    <div className="mb-4 flex flex-wrap items-center gap-3">
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
    </div>
  );

  if (filtered.length === 0) {
    return (
      <div>
        {vendorSelect}
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          No flagged reviews.
        </div>
      </div>
    );
  }

  return (
    <div>
      {vendorSelect}
    <div className="flex flex-col gap-3.5">
      {filtered.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-[18px_20px]"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold text-ink">{r.profiles?.full_name ?? "Anonymous"}</span>
              <span className="text-xs text-accent">{"★".repeat(r.rating)}</span>
              <span className="text-[11px] text-muted-table">on {r.products.name}</span>
            </div>
            <p className="text-[12.5px] text-ink-dark">{r.body}</p>
            <span className="text-[11px] font-bold text-danger">Flagged: {r.flag_reason}</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => keepMutation.mutate(r.id)}
              className="rounded-[7px] border border-border bg-white px-3.5 py-2 text-xs font-bold text-primary"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => setPendingRemoveId(r.id)}
              className="rounded-[7px] bg-danger px-3.5 py-2 text-xs font-bold text-white"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!pendingRemoveId}
        title="Remove this review?"
        message="It will no longer be visible on the product page."
        confirmLabel="Remove"
        loading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate(pendingRemoveId!)}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
    </div>
  );
}
