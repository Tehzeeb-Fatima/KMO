import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllReturns, updateReturnStatus } from "@kmo/shared/api";
import type { ReturnStatus } from "@kmo/shared/types";
import { StatusBadge, type StatusBadgeVariant } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

const STATUS_META: Record<ReturnStatus, { label: string; variant: StatusBadgeVariant }> = {
  requested: { label: "Requested", variant: "warning" },
  approved: { label: "Approved", variant: "info" },
  rejected: { label: "Rejected", variant: "danger" },
  processing: { label: "Processing", variant: "info" },
  resolved: { label: "Resolved", variant: "success" },
};

export function ReturnsPage() {
  const queryClient = useQueryClient();
  const { data: returns, isLoading } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: () => listAllReturns(supabase),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReturnStatus }) =>
      updateReturnStatus(supabase, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-returns"] }),
  });

  if (isLoading) return <p className="text-sm text-muted">Loading…</p>;

  if (!returns || returns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
        No return requests.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {returns.map((r) => {
        const meta = STATUS_META[r.status];
        return (
          <div key={r.id} className="rounded-xl border border-border bg-surface p-[18px_20px]">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink-dark">
                Order #{r.orders?.order_number} — return request
              </p>
              <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-dark">{r.reason}</p>
            {r.status === "requested" ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => mutation.mutate({ id: r.id, status: "approved" })}
                  className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => mutation.mutate({ id: r.id, status: "rejected" })}
                  className="rounded-md border border-border bg-white px-3 py-1.5 text-[11px] font-bold text-danger"
                >
                  Reject
                </button>
              </div>
            ) : r.status === "approved" || r.status === "processing" ? (
              <button
                type="button"
                onClick={() => mutation.mutate({ id: r.id, status: "resolved" })}
                className="mt-3 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Mark resolved
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
