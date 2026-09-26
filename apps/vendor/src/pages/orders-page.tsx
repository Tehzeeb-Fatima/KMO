import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyVendor, listVendorOrders, notifyAdmins, updateOrderStatus } from "@kmo/shared/api";
import type { OrderStatus } from "@kmo/shared/types";
import { StatusBadge } from "@kmo/shared/ui";
import { ORDER_STATUS_META, ORDER_STATUS_FLOW } from "@kmo/shared/lib";
import { supabase } from "../lib/supabase";

const VENDOR_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "confirmed", label: "Confirm order" },
  { value: "processing", label: "Mark as processing" },
  { value: "ready_to_ship", label: "Mark as ready to ship" },
  { value: "shipped", label: "Mark as shipped" },
  { value: "out_for_delivery", label: "Mark as out for delivery" },
  { value: "delivered", label: "Mark as delivered" },
];

const FILTER_TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

export function OrdersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });

  if (!vendor) return <p className="text-sm text-muted">Loading…</p>;

  if (selectedId) {
    return <OrderDetail vendorId={vendor.id} orderId={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <OrdersList vendorId={vendor.id} onOpen={setSelectedId} />;
}

function OrdersList({ vendorId, onOpen }: { vendorId: string; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["vendor-orders", vendorId],
    queryFn: () => listVendorOrders(supabase, vendorId),
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!o.order_number.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, filter, search]);

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className="rounded-full px-[15px] py-2 text-[12.5px] font-bold"
            style={
              filter === tab.value
                ? { background: "var(--color-primary)", color: "#fff", border: "1px solid var(--color-primary)" }
                : { background: "#fff", color: "var(--color-primary)", border: "1px solid var(--color-border)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-[18px] flex items-center gap-3">
        <input
          placeholder="Search by order #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[300px] flex-1 rounded-lg border border-border px-[14px] py-[10px] text-[13px] outline-none focus:border-primary-light"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1fr_1.3fr_1fr_1fr_1fr] items-center bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
            <span>Order</span>
            <span>Customer</span>
            <span>Date</span>
            <span className="text-right">Total</span>
            <span className="text-center">Status</span>
          </div>

          {isLoading ? (
            <p className="p-5 text-sm text-muted">Loading orders…</p>
          ) : filtered.length === 0 ? (
            <p className="p-5 text-sm text-muted">No orders yet.</p>
          ) : (
            filtered.map((o) => {
              const meta = ORDER_STATUS_META[o.status];
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onOpen(o.id)}
                  className="grid w-full grid-cols-[1fr_1.3fr_1fr_1fr_1fr] items-center border-t border-[#F5F0EE] px-5 py-4 text-left"
                >
                  <span className="text-[13px] font-bold text-primary">#{o.order_number}</span>
                  <span className="text-[12.5px] text-ink-dark">
                    {o.profiles?.full_name ?? "Customer"}
                  </span>
                  <span className="text-[12.5px] text-muted">
                    {new Date(o.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                  <span className="text-right text-[13px] font-bold text-ink-dark">
                    Rs. {o.total.toLocaleString()}
                  </span>
                  <span className="flex justify-center">
                    <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetail({
  vendorId,
  orderId,
  onBack,
}: {
  vendorId: string;
  orderId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ["vendor-orders", vendorId],
    queryFn: () => listVendorOrders(supabase, vendorId),
  });
  const order = orders?.find((o) => o.id === orderId);

  const mutation = useMutation({
    mutationFn: async (status: OrderStatus) => {
      await updateOrderStatus(supabase, orderId, status);
      if (order) {
        await notifyAdmins(supabase, {
          type: "order_status",
          title: `Order #${order.order_number} → ${ORDER_STATUS_META[status].label}`,
          body: `${order.vendors?.store_name ?? "A vendor"} updated an order for ${order.profiles?.full_name ?? "a customer"}.`,
          link: "/orders",
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-orders", vendorId] }),
  });

  const [statusChoice, setStatusChoice] = useState<OrderStatus | null>(null);

  if (!order) return <p className="text-sm text-muted">Loading order…</p>;

  const meta = ORDER_STATUS_META[order.status];
  const nextStatus = nextInFlow(order.status);
  const currentFlowIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const availableOptions = VENDOR_STATUS_OPTIONS.filter(
    (opt) => ORDER_STATUS_FLOW.indexOf(opt.value) >= currentFlowIndex,
  );
  const selectedStatus = statusChoice ?? nextStatus ?? availableOptions[0]?.value ?? null;

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 text-[12.5px] font-bold text-accent">
        ← Back to orders
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-ink">Order #{order.order_number}</h1>
              <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              Placed {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="mb-3 text-[15px] font-bold text-ink">Items</p>
            <div className="flex flex-col gap-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-[13px]">
                  <span className="text-ink-dark">
                    {item.product_name}
                    {item.variant_label ? ` (${item.variant_label})` : ""} × {item.quantity}
                  </span>
                  <span className="font-bold text-ink-dark">
                    Rs. {(item.unit_price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted-table">
              Fulfilment
            </p>
            <p className="text-[13px] text-ink-dark">
              {order.payment_method === "cod" ? "Cash on delivery" : order.payment_method} · Rs.{" "}
              {order.total.toLocaleString()}
            </p>
          </div>

          {order.promotion_discount_amount > 0 ? (
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted-table">
                Promotion applied
              </p>
              <p className="text-[13px] text-ink-dark">
                Rs. {order.promotion_discount_amount.toLocaleString()} off this order
              </p>
              {order.promotion_vendor_funded_amount > 0 ? (
                <p className="mt-1 text-[12.5px] text-danger">
                  You cover Rs. {order.promotion_vendor_funded_amount.toLocaleString()} of it —
                  your payout for this order is reduced by that amount. Commission is still
                  calculated on the full price.
                </p>
              ) : (
                <p className="mt-1 text-[12.5px] text-success">
                  Fully covered by KMO — your payout for this order isn&rsquo;t affected.
                </p>
              )}
            </div>
          ) : null}

          {order.status !== "delivered" && order.status !== "cancelled" ? (
            <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted-table">
                Update status
              </p>
              {availableOptions.length > 0 ? (
                <>
                  <select
                    value={selectedStatus ?? ""}
                    onChange={(e) => setStatusChoice(e.target.value as OrderStatus)}
                    className="rounded-lg border border-border px-3 py-2.5 text-[13px] text-ink-dark outline-none focus:border-primary-light"
                  >
                    {availableOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => selectedStatus && mutation.mutate(selectedStatus)}
                    disabled={mutation.isPending || !selectedStatus}
                    className="rounded-[9px] bg-accent px-3 py-3 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    {mutation.isPending ? "Updating…" : "Update status"}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => mutation.mutate("cancelled")}
                disabled={mutation.isPending}
                className="rounded-[9px] border border-border bg-white px-3 py-3 text-[13.5px] font-bold text-danger"
              >
                Cancel order
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function nextInFlow(status: OrderStatus): OrderStatus | null {
  const idx = ORDER_STATUS_FLOW.indexOf(status);
  if (idx === -1 || idx === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[idx + 1];
}
