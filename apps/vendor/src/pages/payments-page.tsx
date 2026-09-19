import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPayout, getMyVendor, getVendorDueAmount, listVendorPayouts } from "@kmo/shared/api";
import { StatusBadge } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });

  const { data: due } = useQuery({
    queryKey: ["vendor-due", vendor?.id],
    queryFn: () => getVendorDueAmount(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["vendor-payouts", vendor?.id],
    queryFn: () => listVendorPayouts(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const paidToDate = payouts?.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0) ?? 0;
  const commissionRate = vendor?.commission_rate ?? 8;

  const [amountInput, setAmountInput] = useState("");
  const [requested, setRequested] = useState(false);

  const requestMutation = useMutation({
    mutationFn: () => {
      const amount = Number(amountInput.replace(/[^0-9.]/g, "")) || due || 0;
      return createPayout(supabase, { vendor_id: vendor!.id, amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-payouts", vendor?.id] });
      setAmountInput("");
      setRequested(true);
      setTimeout(() => setRequested(false), 3000);
    },
  });

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Available balance" value={`Rs. ${(due ?? 0).toLocaleString()}`} />
        <StatTile label="Paid to date" value={`Rs. ${paidToDate.toLocaleString()}`} />
        <StatTile label="Commission rate" value={`${commissionRate}%`} accent />
      </div>

      <div className="mb-4 flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
        <p className="text-[13px] font-bold text-ink">Request a withdrawal</p>
        <input
          placeholder={`Amount, e.g. Rs. ${(due ?? 0).toLocaleString()} (leave blank for full balance)`}
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          onClick={() => requestMutation.mutate()}
          disabled={requestMutation.isPending || !vendor || (due ?? 0) <= 0}
          className="w-fit rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {requestMutation.isPending ? "Sending…" : "Send request to admin"}
        </button>
        {requested ? <span className="text-xs text-success">Request sent — an admin will review it.</span> : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-4 bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>Payout date</span>
          <span>Amount</span>
          <span>Commission</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : !payouts || payouts.length === 0 ? (
          <p className="p-5 text-sm text-muted">No payouts yet.</p>
        ) : (
          payouts.map((p) => (
            <div key={p.id} className="grid grid-cols-4 items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]">
              <span className="text-ink-dark">
                {p.payout_date
                  ? new Date(p.payout_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </span>
              <span className="font-bold text-ink-dark">Rs. {p.amount.toLocaleString()}</span>
              <span className="text-ink-dark">
                Rs. {Math.round(p.amount * (commissionRate / 100)).toLocaleString()}
              </span>
              <span>
                <StatusBadge variant={p.status === "paid" ? "success" : "warning"}>
                  {p.status === "paid" ? "Paid" : "Scheduled"}
                </StatusBadge>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted-table">{label}</p>
      <p className="mt-1 text-2xl font-extrabold" style={{ color: accent ? "var(--color-accent)" : "var(--color-ink-dark)" }}>
        {value}
      </p>
    </div>
  );
}
