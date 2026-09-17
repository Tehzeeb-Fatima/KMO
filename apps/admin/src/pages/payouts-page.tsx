import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPayout,
  getPlatformCommissionThisMonth,
  getVendorDueAmount,
  listAdminPayouts,
  listVendors,
  logAdminAction,
  markPayoutPaid,
} from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function PayoutsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: () => listAdminPayouts(supabase),
  });

  const { data: vendors } = useQuery({
    queryKey: ["approved-vendors"],
    queryFn: () => listVendors(supabase, { status: "approved" }),
  });

  const { data: commissionThisMonth } = useQuery({
    queryKey: ["platform-commission"],
    queryFn: () => getPlatformCommissionThisMonth(supabase),
  });

  const pending = payouts?.filter((p) => p.status === "pending") ?? [];
  const paidThisMonth =
    payouts
      ?.filter((p) => p.status === "paid" && isThisMonth(p.payout_date))
      .reduce((s, p) => s + p.amount, 0) ?? 0;

  const payMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const due = await getVendorDueAmount(supabase, vendorId);
      const created = await createPayout(supabase, { vendor_id: vendorId, amount: due });
      return markPayoutPaid(supabase, created.id, vendorId, {
        payout_date: new Date().toISOString().slice(0, 10),
      });
    },
    onSuccess: (paid, vendorId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      if (user) {
        void logAdminAction(supabase, user.id, "payout.paid", "vendor", vendorId, {
          amount: paid.amount,
        });
      }
    },
  });

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Pending payouts"
          value={`Rs. ${pending.reduce((s, p) => s + p.amount, 0).toLocaleString()}`}
        />
        <StatTile label="Paid this month" value={`Rs. ${paidThisMonth.toLocaleString()}`} />
        <StatTile
          label="Platform commission"
          value={`Rs. ${(commissionThisMonth ?? 0).toLocaleString()}`}
          accent
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_120px] bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>Vendor</span>
          <span>Last payout</span>
          <span>Status</span>
          <span>Date</span>
          <span />
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : vendors?.length === 0 ? (
          <p className="p-5 text-sm text-muted">No approved vendors yet.</p>
        ) : (
          vendors?.map((v) => {
            const vendorPayouts = payouts?.filter((p) => p.vendor_id === v.id) ?? [];
            const latest = vendorPayouts[0];
            return (
              <div
                key={v.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_120px] items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]"
              >
                <span className="font-bold text-ink-dark">{v.store_name}</span>
                <span className="text-ink-dark">
                  {latest ? `Rs. ${latest.amount.toLocaleString()}` : "—"}
                </span>
                <span className="text-muted">{latest?.status ?? "—"}</span>
                <span className="text-muted">
                  {latest?.payout_date ? new Date(latest.payout_date).toLocaleDateString() : "—"}
                </span>
                <button
                  type="button"
                  onClick={() => payMutation.mutate(v.id)}
                  disabled={payMutation.isPending}
                  className="w-fit rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                >
                  Pay now
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted-table">{label}</p>
      <p
        className="mt-1 text-2xl font-extrabold"
        style={{ color: accent ? "var(--color-accent)" : "var(--color-ink-dark)" }}
      >
        {value}
      </p>
    </div>
  );
}
