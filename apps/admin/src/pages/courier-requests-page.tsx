import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCourierRequests,
  listVendors,
  pushCourierBookings,
  rejectCourierBooking,
} from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

export function CourierRequestsPage() {
  const queryClient = useQueryClient();
  const [vendorId, setVendorId] = useState<string>("");

  const { data: vendors } = useQuery({
    queryKey: ["all-vendors-for-courier-requests"],
    queryFn: () => listVendors(supabase, { status: "approved" }),
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["courier-requests", vendorId],
    queryFn: () => listCourierRequests(supabase, { vendorId: vendorId || undefined }),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = (requests?.length ?? 0) > 0 && requests!.every((r) => selected.has(r.id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(requests?.map((r) => r.id) ?? []));
  }

  const [pushResultMessage, setPushResultMessage] = useState<string | null>(null);
  const pushMutation = useMutation({
    mutationFn: (ids: string[]) => pushCourierBookings(supabase, ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["courier-requests"] });
      setSelected(new Set());
      const ok = res.results.filter((r) => r.ok).length;
      const failed = res.results.filter((r) => !r.ok);
      setPushResultMessage(
        `${ok} booked with courier.` +
          (failed.length ? ` ${failed.length} failed: ${failed.map((f) => f.error).join("; ")}` : ""),
      );
    },
  });

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const rejectMutation = useMutation({
    mutationFn: () => rejectCourierBooking(supabase, rejectTarget!, rejectNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-requests"] });
      setRejectTarget(null);
      setRejectNote("");
    },
  });

  const vendorOptions = useMemo(() => vendors ?? [], [vendors]);

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="rounded-lg border border-border px-[14px] py-[10px] text-[13px] text-ink"
        >
          <option value="">All vendors</option>
          {vendorOptions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.store_name}
            </option>
          ))}
        </select>
      </div>

      {pushResultMessage ? (
        <p className="mb-3 text-[12.5px] font-semibold text-ink-dark">
          {pushResultMessage}{" "}
          <button type="button" onClick={() => setPushResultMessage(null)} className="text-accent">
            Dismiss
          </button>
        </p>
      ) : null}

      {selected.size > 0 ? (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-border bg-primary-tint p-3">
          <span className="text-[13px] font-bold text-ink-dark">{selected.size} selected</span>
          <button
            type="button"
            disabled={pushMutation.isPending}
            onClick={() => pushMutation.mutate([...selected])}
            className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60"
          >
            {pushMutation.isPending ? "Pushing…" : "Approve & push to Courier"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[12px] font-bold text-muted"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[28px_1fr_1.4fr_1fr_1fr_1fr_160px] items-center bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
            <input type="checkbox" aria-label="Select all" checked={allSelected} disabled={!requests?.length} onChange={toggleAll} />
            <span>Order</span>
            <span>Vendor</span>
            <span>Customer</span>
            <span>City</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {isLoading ? (
            <p className="p-5 text-sm text-muted">Loading…</p>
          ) : !requests || requests.length === 0 ? (
            <p className="p-5 text-sm text-muted">No courier requests awaiting review.</p>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="grid min-w-[860px] grid-cols-[28px_1fr_1.4fr_1fr_1fr_1fr_160px] items-center border-t border-[#F5F0EE] px-5 py-4 text-[12.5px]"
              >
                <input
                  type="checkbox"
                  aria-label={`Select order ${r.order_number}`}
                  checked={selected.has(r.id)}
                  onChange={() => toggleSelected(r.id)}
                />
                <span className="font-bold text-primary">#{r.order_number}</span>
                <span className="truncate text-ink-dark">{r.vendors?.store_name ?? "—"}</span>
                <span className="truncate text-ink-dark">{r.ship_name ?? r.profiles?.full_name ?? "Customer"}</span>
                <span className="text-muted">{r.ship_city ?? "—"}</span>
                <span className="text-right font-bold text-ink-dark">Rs. {r.total.toLocaleString()}</span>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    disabled={pushMutation.isPending}
                    onClick={() => pushMutation.mutate([r.id])}
                    className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectTarget(r.id)}
                    className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {rejectTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setRejectTarget(null);
            setRejectNote("");
          }}
        >
          <div
            className="w-full max-w-[380px] rounded-xl border border-border bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[16px] font-bold text-ink">Reject this courier request?</h2>
            <p className="mt-2 text-[13.5px] text-muted">
              The vendor will see this order as rejected and can request again.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason (optional, shown to vendor)"
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => {
                  setRejectTarget(null);
                  setRejectNote("");
                }}
                className="rounded-[9px] border border-border bg-white px-4 py-2.5 text-[13px] font-bold text-ink-dark disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
                className="rounded-[9px] bg-danger px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {rejectMutation.isPending ? "Please wait…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
