import { useQuery } from "@tanstack/react-query";
import { getMyVendor, getVendorSalesReport } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

export function SalesReportPage() {
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const { data: report, isLoading } = useQuery({
    queryKey: ["vendor-sales-report", vendor?.id],
    queryFn: () => getVendorSalesReport(supabase, vendor!.id),
    enabled: !!vendor,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="grid grid-cols-4 bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
        <span>Period</span>
        <span>Orders</span>
        <span>Revenue</span>
        <span>Avg. order value</span>
      </div>
      {isLoading ? (
        <p className="p-5 text-sm text-muted">Loading…</p>
      ) : !report || report.length === 0 ? (
        <p className="p-5 text-sm text-muted">No sales yet.</p>
      ) : (
        report.map((r) => (
          <div key={r.period} className="grid grid-cols-4 items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]">
            <span className="font-bold text-ink-dark">{r.period}</span>
            <span className="text-ink-dark">{r.orders}</span>
            <span className="text-ink-dark">Rs. {r.revenue.toLocaleString()}</span>
            <span className="text-ink-dark">Rs. {r.avgOrderValue.toLocaleString()}</span>
          </div>
        ))
      )}
    </div>
  );
}
