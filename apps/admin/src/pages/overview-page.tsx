import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminOverviewStats,
  getSalesTrend,
  getTopCategories,
  getPendingApprovals,
  setVendorStatus,
  updateProduct,
  type PendingApprovalItem,
} from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

const MONEY = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

export function OverviewPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverviewStats(supabase),
  });
  const { data: trend } = useQuery({
    queryKey: ["admin-sales-trend"],
    queryFn: () => getSalesTrend(supabase, 30),
  });
  const { data: topCategories } = useQuery({
    queryKey: ["admin-top-categories"],
    queryFn: () => getTopCategories(supabase, 30),
  });
  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ["admin-pending-approvals"],
    queryFn: () => getPendingApprovals(supabase, 5),
  });

  function refreshAfterDecision() {
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-approvals"] });
  }

  async function handleApprove(item: PendingApprovalItem) {
    if (item.kind === "vendor") await setVendorStatus(supabase, item.id, "approved");
    else await updateProduct(supabase, item.id, { status: "published" });
    refreshAfterDecision();
  }

  async function handleReject(item: PendingApprovalItem) {
    if (item.kind === "vendor") await setVendorStatus(supabase, item.id, "rejected");
    else await updateProduct(supabase, item.id, { status: "archived" });
    refreshAfterDecision();
  }

  const gmvTotal = (trend ?? []).reduce((sum, p) => sum + p.total, 0);
  const { line, area } = buildChartPoints(trend ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="GMV this month" value={MONEY(stats?.gmvThisMonth ?? 0)} loading={isLoading} />
        <StatTile label="Active vendors" value={String(stats?.activeVendors ?? 0)} loading={isLoading} />
        <StatTile label="Orders today" value={String(stats?.ordersToday ?? 0)} loading={isLoading} />
        <StatTile
          label="Pending approvals"
          value={String((stats?.pendingVendorApprovals ?? 0) + (stats?.pendingProductApprovals ?? 0))}
          sub={
            stats
              ? `${stats.pendingVendorApprovals} vendors, ${stats.pendingProductApprovals} products`
              : undefined
          }
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold text-ink-dark">Gross merchandise value — last 30 days</span>
            <span className="text-xs text-muted">{MONEY(gmvTotal)} total</span>
          </div>
          {trend && trend.length > 0 ? (
            <svg viewBox="0 0 900 180" className="h-[180px] w-full">
              <polyline points={line} fill="none" stroke="#C4552F" strokeWidth={2.5} />
              <polygon points={area} fill="#C4552F" opacity={0.08} />
            </svg>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-sm text-muted">Loading…</div>
          )}
        </div>

        <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
          <span className="text-[15px] font-bold text-ink-dark">Top categories</span>
          {(topCategories ?? []).length === 0 ? (
            <p className="text-sm text-muted">No sales yet this period.</p>
          ) : (
            (topCategories ?? []).map((c) => (
              <div key={c.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12.5px]">
                  <span className="font-semibold text-ink-dark">{c.name}</span>
                  <span className="text-muted">{c.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-primary-tint">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-6 py-5">
        <span className="text-[15px] font-bold text-ink-dark">Pending approvals</span>
        {pendingLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (pending ?? []).length === 0 ? (
          <p className="text-sm text-muted">Nothing waiting on review right now.</p>
        ) : (
          (pending ?? []).map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="flex items-center justify-between gap-4 border-t border-[#F1EAE6] pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13.5px] font-semibold text-ink-dark">{item.title}</span>
                <span className="text-[11.5px] text-muted-table">{item.meta}</span>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleApprove(item)}
                  className="cursor-pointer rounded-[7px] border-0 bg-primary px-4 py-2 text-xs font-bold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(item)}
                  className="cursor-pointer rounded-[7px] border border-border bg-surface px-4 py-2 text-xs font-bold text-danger"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-muted-table">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-ink-dark">
        {loading ? "…" : value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

function buildChartPoints(trend: { date: string; total: number }[]) {
  if (trend.length === 0) return { line: "", area: "" };
  const width = 900;
  const height = 180;
  const max = Math.max(1, ...trend.map((p) => p.total));
  const stepX = width / Math.max(1, trend.length - 1);

  const points = trend.map((p, i) => {
    const x = Math.round(i * stepX);
    const y = Math.round(height - (p.total / max) * (height - 20) - 10);
    return `${x},${y}`;
  });

  const line = points.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return { line, area };
}
