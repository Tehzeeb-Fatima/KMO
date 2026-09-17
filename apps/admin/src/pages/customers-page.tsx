import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

export function CustomersPage() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => listCustomers(supabase),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="grid grid-cols-4 bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
        <span>Customer</span>
        <span>Orders</span>
        <span>Total spend</span>
        <span>Joined</span>
      </div>
      {isLoading ? (
        <p className="p-5 text-sm text-muted">Loading…</p>
      ) : !customers || customers.length === 0 ? (
        <p className="p-5 text-sm text-muted">No customers yet.</p>
      ) : (
        customers.map((c) => (
          <div key={c.id} className="grid grid-cols-4 items-center border-t border-[#F5F0EE] px-5 py-4 text-[13px]">
            <span className="font-bold text-ink-dark">{c.full_name ?? "Customer"}</span>
            <span className="text-ink-dark">{c.order_count}</span>
            <span className="text-ink-dark">Rs. {c.total_spend.toLocaleString()}</span>
            <span className="text-muted">
              {new Date(c.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
