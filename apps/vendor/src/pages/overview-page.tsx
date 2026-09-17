import { useQuery } from "@tanstack/react-query";
import { getMyVendor, getVendorOverviewStats, listVendorOrders } from "@kmo/shared/api";
import { StatusBadge } from "@kmo/shared/ui";
import { ORDER_STATUS_META } from "@kmo/shared/lib";
import { supabase } from "../lib/supabase";

export function OverviewPage() {
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });

  const { data: stats } = useQuery({
    queryKey: ["vendor-overview", vendor?.id],
    queryFn: () => getVendorOverviewStats(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const { data: orders } = useQuery({
    queryKey: ["vendor-orders", vendor?.id],
    queryFn: () => listVendorOrders(supabase, vendor!.id),
    enabled: !!vendor,
  });

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Sales this month" value={`Rs. ${(stats?.salesThisMonth ?? 0).toLocaleString()}`} />
        <StatTile label="Orders this month" value={String(stats?.ordersThisMonth ?? 0)} />
        <StatTile label="Pending orders" value={String(stats?.pendingOrders ?? 0)} accent />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4 text-[15px] font-bold text-ink">
          Recent orders
        </div>
        {!orders || orders.length === 0 ? (
          <p className="p-5 text-sm text-muted">No orders yet.</p>
        ) : (
          orders.slice(0, 5).map((o) => {
            const meta = ORDER_STATUS_META[o.status];
            return (
              <div
                key={o.id}
                className="flex items-center justify-between border-t border-[#F5F0EE] px-5 py-3.5 text-[13px] first:border-t-0"
              >
                <span className="font-bold text-primary">#{o.order_number}</span>
                <span className="text-ink-dark">Rs. {o.total.toLocaleString()}</span>
                <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
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
