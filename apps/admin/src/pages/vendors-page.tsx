import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getVendorById, listVendors, logAdminAction, setVendorStatus } from "@kmo/shared/api";
import { StatusBadge, type StatusBadgeVariant } from "@kmo/shared/ui";
import type { VendorVerificationStatus } from "@kmo/shared/types";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

const STATUS_META: Record<
  VendorVerificationStatus,
  { label: string; variant: StatusBadgeVariant }
> = {
  approved: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  suspended: { label: "Suspended", variant: "danger" },
  rejected: { label: "Rejected", variant: "danger" },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function VendorsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <VendorDetail vendorId={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <VendorsList onOpen={setSelectedId} />;
}

function VendorsList({ onOpen }: { onOpen: (id: string) => void }) {
  const [search, setSearch] = useState("");

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: () => listVendors(supabase),
  });

  const filtered = useMemo(() => {
    if (!vendors) return [];
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.store_name.toLowerCase().includes(q) ||
        (v.area ?? "").toLowerCase().includes(q),
    );
  }, [vendors, search]);

  return (
    <div>
      <div className="mb-[18px] flex items-center gap-3">
        <input
          placeholder="Search vendors by name or area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[340px] flex-1 rounded-lg border border-border px-[14px] py-[10px] text-[13px] outline-none focus:border-primary-light"
        />
        <select className="rounded-lg border border-border px-[14px] py-[10px] text-[13px] text-ink">
          <option>All statuses</option>
        </select>
        <select className="rounded-lg border border-border px-[14px] py-[10px] text-[13px] text-ink">
          <option>All categories</option>
        </select>
        <div className="flex-1" />
        <button
          type="button"
          className="rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white"
        >
          + Add vendor
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_140px] border-b border-border bg-surface-alt px-5 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>Vendor</span>
          <span>Category</span>
          <span>Products</span>
          <span>Rating</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading vendors…</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-muted">No vendors found.</p>
        ) : (
          filtered.map((v) => {
            const meta = STATUS_META[v.verification_status];
            return (
              <div
                key={v.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_140px] items-center border-b border-[#F5F0EE] px-5 py-4 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => onOpen(v.id)}
                  className="flex items-center gap-3 text-left"
                >
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                    {initials(v.store_name)}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13.5px] font-bold text-ink-dark">
                      {v.store_name}
                    </span>
                    <span className="text-[11px] text-muted-table">
                      {v.area || "—"}
                    </span>
                  </span>
                </button>
                <span className="text-[12.5px] text-ink-dark">—</span>
                <span className="text-[12.5px] text-ink-dark">—</span>
                <span className="text-[12.5px] text-ink-dark">—</span>
                <span>
                  <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                </span>
                <RowAction vendorId={v.id} status={v.verification_status} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RowAction({
  vendorId,
  status,
}: {
  vendorId: string;
  status: VendorVerificationStatus;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mutation = useMutation({
    mutationFn: (next: VendorVerificationStatus) =>
      setVendorStatus(supabase, vendorId, next),
    onSuccess: (_updated, next) => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      if (user) void logAdminAction(supabase, user.id, `vendor.${next}`, "vendor", vendorId);
    },
  });

  if (status === "pending") {
    return (
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => mutation.mutate("approved")}
          className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate("rejected")}
          className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
        >
          Reject
        </button>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <button
        type="button"
        onClick={() => mutation.mutate("suspended")}
        className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary"
      >
        Suspend
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => mutation.mutate("approved")}
      className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white"
    >
      Reactivate
    </button>
  );
}

function VendorDetail({ vendorId, onBack }: { vendorId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["admin-vendor", vendorId],
    queryFn: () => getVendorById(supabase, vendorId),
  });

  const mutation = useMutation({
    mutationFn: (next: VendorVerificationStatus) =>
      setVendorStatus(supabase, vendorId, next),
    onSuccess: (updated, next) => {
      queryClient.setQueryData(["admin-vendor", vendorId], updated);
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      if (user) void logAdminAction(supabase, user.id, `vendor.${next}`, "vendor", vendorId);
    },
  });

  if (isLoading || !vendor) {
    return <p className="text-sm text-muted">Loading vendor…</p>;
  }

  const meta = STATUS_META[vendor.verification_status];
  const joined = new Date(vendor.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-[12.5px] font-bold text-accent"
      >
        ← Back to vendors
      </button>

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div className="flex flex-col gap-5">
          <div className="flex gap-[18px] rounded-lg border border-border bg-surface p-6">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-primary text-lg font-extrabold text-white">
              {initials(vendor.store_name)}
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                  {vendor.store_name}
                </span>
                <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">
                {vendor.area || "Area not set"} · Joined {joined}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <span className="text-[15px] font-bold text-ink">Recent orders</span>
            <p className="mt-3 text-sm text-muted">
              No orders yet — order history is built in a later module.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted-table">
              Performance
            </p>
            {[
              ["Total sales", "—"],
              ["Products listed", "—"],
              ["Rating", "—"],
              ["Commission rate", "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1 text-[13px]">
                <span className="text-muted">{label}</span>
                <span className="font-bold text-ink-dark">{value}</span>
              </div>
            ))}
          </div>

          {vendor.verification_status === "pending" ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => mutation.mutate("approved")}
                className="rounded-[9px] bg-primary px-3 py-3 text-[13px] font-bold text-white"
              >
                Approve vendor
              </button>
              <button
                type="button"
                onClick={() => mutation.mutate("rejected")}
                className="rounded-[9px] border border-border bg-white px-3 py-3 text-[13px] font-bold text-danger"
              >
                Reject vendor
              </button>
            </div>
          ) : vendor.verification_status === "approved" ? (
            <button
              type="button"
              onClick={() => mutation.mutate("suspended")}
              className="rounded-[9px] bg-accent px-3 py-3 text-[13px] font-bold text-white"
            >
              Suspend vendor
            </button>
          ) : (
            <button
              type="button"
              onClick={() => mutation.mutate("approved")}
              className="rounded-[9px] bg-primary px-3 py-3 text-[13px] font-bold text-white"
            >
              Reactivate vendor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
