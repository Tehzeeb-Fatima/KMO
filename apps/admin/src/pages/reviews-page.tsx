import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  keepReview,
  listFlaggedReviews,
  listReviewsForModeration,
  listVendors,
  logAdminAction,
  moderateReview,
  removeReview,
  type ModerationReviewRow,
  type ReviewStatus,
} from "@kmo/shared/api";
import { ConfirmDialog, PillTabs } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

type Tab = ReviewStatus | "flagged";

const TABS: { value: Tab; label: string }[] = [
  { value: "pending", label: "Waiting for approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "flagged", label: "Flagged" },
];

export function ReviewsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [vendorFilter, setVendorFilter] = useState("");
  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-for-filter"],
    queryFn: () => listVendors(supabase),
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        New customer reviews wait here until you approve them. Only approved reviews show on the store and count
        towards a product&rsquo;s rating.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs value={tab} onChange={setTab} options={TABS} />
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
      {tab === "flagged" ? (
        <FlaggedReviews vendorFilter={vendorFilter} />
      ) : (
        <ModerationList status={tab} vendorFilter={vendorFilter} />
      )}
    </div>
  );
}

function ModerationList({ status, vendorFilter }: { status: ReviewStatus; vendorFilter: string }) {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["moderation-reviews", status],
    queryFn: () => listReviewsForModeration(supabase, status),
  });
  const filtered = useMemo(
    () => (reviews ?? []).filter((r) => !vendorFilter || r.products?.vendor_id === vendorFilter),
    [reviews, vendorFilter],
  );

  if (isLoading) return <p className="text-sm text-muted">Loading…</p>;
  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
        {status === "pending" ? "No reviews waiting for approval." : `No ${status} reviews.`}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3.5">
      {filtered.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}

function ReviewCard({ review: r }: { review: ModerationReviewRow }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState(r.reviewer_name ?? "");

  const save = useMutation({
    mutationFn: (status: ReviewStatus) =>
      moderateReview(supabase, r.id, { status, reviewer_name: name.trim() || null }),
    onSuccess: (_v, status) => {
      void queryClient.invalidateQueries({ queryKey: ["moderation-reviews"] });
      if (user) void logAdminAction(supabase, user.id, `review.${status}`, "review", r.id);
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-[18px_20px] sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[15px] text-[#f5a623]">
            {"★".repeat(r.rating)}
            <span className="text-border">{"★".repeat(5 - r.rating)}</span>
          </span>
          <span className="text-[12px] text-muted-table">
            {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <p className="text-[13.5px] text-ink-dark">{r.body || <span className="text-muted">(no text)</span>}</p>
        <p className="text-[12px] text-muted">
          on <span className="font-semibold text-ink-dark">{r.products?.name ?? "deleted product"}</span>
          {r.products?.vendors?.store_name ? ` · ${r.products.vendors.store_name}` : ""}
        </p>
        <label className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-bold text-ink-dark">
          Name shown
          <input
            value={name}
            maxLength={40}
            placeholder="Customer"
            onChange={(e) => setName(e.target.value)}
            className="w-[180px] rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12.5px] font-normal text-ink-dark outline-none focus:border-primary-light"
          />
        </label>
      </div>
      <div className="flex shrink-0 gap-2">
        {r.status !== "approved" ? (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate("approved")}
            className="rounded-[7px] bg-primary px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Approve
          </button>
        ) : (
          <button
            type="button"
            disabled={save.isPending || name.trim() === (r.reviewer_name ?? "")}
            onClick={() => save.mutate("approved")}
            className="rounded-[7px] border border-border bg-white px-3.5 py-2 text-xs font-bold text-primary disabled:opacity-50"
          >
            Save name
          </button>
        )}
        {r.status !== "rejected" ? (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate("rejected")}
            className="rounded-[7px] border border-border bg-white px-3.5 py-2 text-xs font-bold text-danger disabled:opacity-50"
          >
            Reject
          </button>
        ) : null}
      </div>
      {save.isError ? <p className="text-[12px] text-danger">{(save.error as Error).message}</p> : null}
    </div>
  );
}

function FlaggedReviews({ vendorFilter }: { vendorFilter: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["flagged-reviews"],
    queryFn: () => listFlaggedReviews(supabase),
  });
  const filtered = useMemo(
    () => (reviews ?? []).filter((r) => !vendorFilter || r.products.vendor_id === vendorFilter),
    [reviews, vendorFilter],
  );

  const keepMutation = useMutation({
    mutationFn: (id: string) => keepReview(supabase, id),
    onSuccess: (_v, id) => {
      void queryClient.invalidateQueries({ queryKey: ["flagged-reviews"] });
      if (user) void logAdminAction(supabase, user.id, "review.keep", "review", id);
    },
  });
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const removeMutation = useMutation({
    mutationFn: (id: string) => removeReview(supabase, id),
    onSuccess: (_v, id) => {
      void queryClient.invalidateQueries({ queryKey: ["flagged-reviews"] });
      if (user) void logAdminAction(supabase, user.id, "review.remove", "review", id);
      setPendingRemoveId(null);
    },
  });

  if (isLoading) return <p className="text-sm text-muted">Loading…</p>;
  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
        No flagged reviews.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {filtered.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-[18px_20px]"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold text-ink">
                {r.reviewer_name ?? r.profiles?.full_name ?? "Customer"}
              </span>
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
  );
}
