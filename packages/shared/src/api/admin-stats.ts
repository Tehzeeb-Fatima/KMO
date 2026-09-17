import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

export interface AdminOverviewStats {
  gmvThisMonth: number;
  activeVendors: number;
  ordersToday: number;
  pendingVendorApprovals: number;
  pendingProductApprovals: number;
}

export async function getAdminOverviewStats(supabase: Client): Promise<AdminOverviewStats> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [gmv, vendorsCount, ordersTodayCount, pendingVendors, pendingProducts] = await Promise.all([
    supabase.from("orders").select("total").gte("created_at", monthStart.toISOString()),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "approved"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    gmvThisMonth: (gmv.data ?? []).reduce((sum, o) => sum + o.total, 0),
    activeVendors: vendorsCount.count ?? 0,
    ordersToday: ordersTodayCount.count ?? 0,
    pendingVendorApprovals: pendingVendors.count ?? 0,
    pendingProductApprovals: pendingProducts.count ?? 0,
  };
}

export interface SalesTrendPoint {
  date: string;
  total: number;
}

/** Daily GMV for the last `days` days, oldest first — feeds the Overview trend chart. */
export async function getSalesTrend(supabase: Client, days = 30): Promise<SalesTrendPoint[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at")
    .gte("created_at", start.toISOString());
  if (error) throw error;

  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of data ?? []) {
    const key = row.created_at.slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + row.total);
  }
  return Array.from(byDay.entries()).map(([date, total]) => ({ date, total }));
}

export interface TopCategoryRow {
  name: string;
  revenue: number;
  pct: number;
}

/** Revenue share by category over the last `days` days, highest first (top 5). */
export async function getTopCategories(supabase: Client, days = 30): Promise<TopCategoryRow[]> {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const orderIdsRes = await supabase.from("orders").select("id").gte("created_at", start.toISOString());
  if (orderIdsRes.error) throw orderIdsRes.error;
  const recentOrderIds = new Set((orderIdsRes.data ?? []).map((o) => o.id));

  const [itemsRes, productsRes, categoriesRes] = await Promise.all([
    supabase.from("order_items").select("order_id, product_id, unit_price, quantity"),
    supabase.from("products").select("id, category_id"),
    supabase.from("categories").select("id, name"),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (productsRes.error) throw productsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  const categoryById = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name]));
  const categoryByProduct = new Map((productsRes.data ?? []).map((p) => [p.id, p.category_id]));

  const revenueByCategory = new Map<string, number>();
  let totalRevenue = 0;
  for (const item of itemsRes.data ?? []) {
    if (!item.product_id || !recentOrderIds.has(item.order_id)) continue;
    const categoryId = categoryByProduct.get(item.product_id);
    const categoryName = (categoryId && categoryById.get(categoryId)) || "Uncategorised";
    const revenue = item.unit_price * item.quantity;
    revenueByCategory.set(categoryName, (revenueByCategory.get(categoryName) ?? 0) + revenue);
    totalRevenue += revenue;
  }

  return Array.from(revenueByCategory.entries())
    .map(([name, revenue]) => ({
      name,
      revenue,
      pct: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export interface PendingApprovalItem {
  kind: "vendor" | "product";
  id: string;
  title: string;
  meta: string;
}

/** Pending vendor applications + pending product listings, newest first — feeds the Overview approvals list. */
export async function getPendingApprovals(supabase: Client, limit = 5): Promise<PendingApprovalItem[]> {
  const [vendors, products] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, store_name, area, created_at")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, name, vendor_id, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  if (vendors.error) throw vendors.error;
  if (products.error) throw products.error;

  const vendorIds = Array.from(new Set((products.data ?? []).map((p) => p.vendor_id)));
  const vendorNames = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendorRows, error: vendorErr } = await supabase
      .from("vendors")
      .select("id, store_name")
      .in("id", vendorIds);
    if (vendorErr) throw vendorErr;
    for (const v of vendorRows ?? []) vendorNames.set(v.id, v.store_name);
  }

  const items: PendingApprovalItem[] = [
    ...(vendors.data ?? []).map((v) => ({
      kind: "vendor" as const,
      id: v.id,
      title: `New vendor application — ${v.store_name}`,
      meta: v.area ? `${v.area}, Karachi` : "Awaiting review",
    })),
    ...(products.data ?? []).map((p) => ({
      kind: "product" as const,
      id: p.id,
      title: `Product listed — ${p.name}`,
      meta: vendorNames.get(p.vendor_id) ?? "Unknown vendor",
    })),
  ];
  return items.slice(0, limit);
}

export interface CustomerRow {
  id: string;
  full_name: string | null;
  created_at: string;
  order_count: number;
  total_spend: number;
}

export async function listCustomers(supabase: Client): Promise<CustomerRow[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: orders } = await supabase.from("orders").select("customer_id, total");

  return profiles.map((p) => {
    const customerOrders = orders?.filter((o) => o.customer_id === p.id) ?? [];
    return {
      ...p,
      order_count: customerOrders.length,
      total_spend: customerOrders.reduce((sum, o) => sum + o.total, 0),
    };
  });
}
