import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

export interface VendorOverviewStats {
  salesThisMonth: number;
  ordersThisMonth: number;
  pendingOrders: number;
}

export async function getVendorOverviewStats(
  supabase: Client,
  vendorId: string,
): Promise<VendorOverviewStats> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthOrders, pendingCount] = await Promise.all([
    supabase
      .from("orders")
      .select("total")
      .eq("vendor_id", vendorId)
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .in("status", ["pending", "confirmed"]),
  ]);

  const orders = monthOrders.data ?? [];
  return {
    salesThisMonth: orders.reduce((sum, o) => sum + o.total, 0),
    ordersThisMonth: orders.length,
    pendingOrders: pendingCount.count ?? 0,
  };
}

export interface SalesReportRow {
  period: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

/** Revenue grouped by calendar month, most recent first. */
export async function getVendorSalesReport(
  supabase: Client,
  vendorId: string,
): Promise<SalesReportRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const byMonth = new Map<string, { orders: number; revenue: number }>();
  for (const o of data) {
    const d = new Date(o.created_at);
    const key = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const entry = byMonth.get(key) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += o.total;
    byMonth.set(key, entry);
  }

  return Array.from(byMonth.entries()).map(([period, { orders, revenue }]) => ({
    period,
    orders,
    revenue,
    avgOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
  }));
}
