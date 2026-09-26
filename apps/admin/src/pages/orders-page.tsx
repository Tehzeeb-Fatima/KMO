import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAllOrders,
  logAdminAction,
  notifyUser,
  updateOrderStatus,
  type AdminOrderRow,
} from "@kmo/shared/api";
import type { OrderStatus } from "@kmo/shared/types";
import { StatusBadge } from "@kmo/shared/ui";
import { ORDER_STATUS_META, ORDER_STATUS_FLOW } from "@kmo/shared/lib";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function OrdersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => listAllOrders(supabase),
  });

  if (selectedId && orders) {
    const order = orders.find((o) => o.id === selectedId);
    if (order) return <OrderDetail order={order} onBack={() => setSelectedId(null)} />;
  }

  return <OrdersList orders={orders} isLoading={isLoading} onOpen={setSelectedId} />;
}

function OrdersList({
  orders,
  isLoading,
  onOpen,
}: {
  orders: AdminOrderRow[] | undefined;
  isLoading: boolean;
  onOpen: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.profiles?.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  return (
    <div>
      <div className="mb-[18px] flex items-center gap-3">
        <input
          placeholder="Search by order # or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[340px] flex-1 rounded-lg border border-border px-[14px] py-[10px] text-[13px] outline-none focus:border-primary-light"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="rounded-lg border border-border px-[14px] py-[10px] text-[13px] text-ink-dark"
        >
          <option value="all">All statuses</option>
          {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
          <span>Order</span>
          <span>Customer / Vendor</span>
          <span>Date</span>
          <span>Total</span>
          <span>Status</span>
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
                className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] items-center border-t border-[#F5F0EE] px-5 py-4 text-left"
              >
                <span className="text-[13px] font-bold text-primary">#{o.order_number}</span>
                <span className="flex flex-col text-[12.5px]">
                  <span className="text-ink-dark">{o.profiles?.full_name ?? "Customer"}</span>
                  <span className="text-muted-table">{o.vendors?.store_name}</span>
                </span>
                <span className="text-[12.5px] text-muted">
                  {new Date(o.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
                <span className="text-[13px] font-bold text-ink-dark">Rs. {o.total.toLocaleString()}</span>
                <span>
                  <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function OrderDetail({
  order,
  onBack,
}: {
  order: AdminOrderRow;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mutation = useMutation({
    mutationFn: async (status: OrderStatus) => {
      await updateOrderStatus(supabase, order.id, status);
      if (order.vendors?.owner_id) {
        await notifyUser(supabase, order.vendors.owner_id, {
          type: "order_status",
          title: `Order #${order.order_number} → ${ORDER_STATUS_META[status].label}`,
          body: "The KMO team updated the status of one of your orders.",
          link: "/orders",
        });
      }
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      if (user) void logAdminAction(supabase, user.id, `order.status.${status}`, "order", order.id);
    },
  });

  const meta = ORDER_STATUS_META[order.status];
  const nextStatus = nextInFlow(order.status);

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
              Placed{" "}
              {new Date(order.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {order.profiles?.full_name ?? "Customer"} · {order.vendors?.store_name}
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
              Delivery
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
                Rs. {order.promotion_discount_amount.toLocaleString()} discount ·{" "}
                {order.commission_amount.toLocaleString()} commission unaffected
              </p>
              <div className="mt-1.5 flex justify-between text-[12px] text-muted">
                <span>KMO covers</span>
                <span className="font-semibold text-ink-dark">
                  Rs. {order.promotion_kmo_funded_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[12px] text-muted">
                <span>Vendor covers</span>
                <span className="font-semibold text-ink-dark">
                  Rs. {order.promotion_vendor_funded_amount.toLocaleString()}
                </span>
              </div>
            </div>
          ) : null}

          {nextStatus && order.status !== "cancelled" ? (
            <button
              type="button"
              onClick={() => mutation.mutate(nextStatus)}
              disabled={mutation.isPending}
              className="rounded-[9px] border border-border bg-white px-3 py-3 text-[13.5px] font-bold text-primary disabled:opacity-60"
            >
              Mark as {ORDER_STATUS_META[nextStatus].label.toLowerCase()}
            </button>
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
