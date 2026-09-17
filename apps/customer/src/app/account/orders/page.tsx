"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReturnRequest, listMyOrders, type OrderWithItems } from "@kmo/shared/api";
import { StatusBadge } from "@kmo/shared/ui";
import { ORDER_STATUS_META, ORDER_STATUS_FLOW } from "@kmo/shared/lib";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";

export default function OrdersPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => listMyOrders(supabase),
  });

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
        Your orders
      </h1>

      {isLoading ? (
        <p className="text-sm text-muted">Loading orders…</p>
      ) : !orders || orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          You haven&rsquo;t placed any orders yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [returningItemId, setReturningItemId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const meta = ORDER_STATUS_META[order.status];
  const stepIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const isTerminal = order.status === "cancelled" || order.status === "returned";
  const canReturn = order.status === "delivered";

  const returnMutation = useMutation({
    mutationFn: (orderItemId: string) =>
      createReturnRequest(supabase, {
        orderId: order.id,
        orderItemId,
        customerId: user!.id,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      setReturningItemId(null);
      setReason("");
    },
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink-dark">
            Order #{order.order_number} · {order.vendors?.store_name}
          </p>
          <p className="text-xs text-muted">
            Placed{" "}
            {new Date(order.created_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
      </div>

      {!isTerminal ? (
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto">
          {ORDER_STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: i <= stepIndex ? "var(--color-accent)" : "var(--color-border)",
                }}
              />
              {i < ORDER_STATUS_FLOW.length - 1 ? (
                <span
                  className="h-px w-6 shrink-0"
                  style={{ background: i < stepIndex ? "var(--color-accent)" : "var(--color-border)" }}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 border-t border-[#F1EAE6] pt-4">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-[13px]">
            <span className="text-ink-dark">
              {item.product_name}
              {item.variant_label ? ` (${item.variant_label})` : ""} × {item.quantity}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-ink-dark">
                Rs. {(item.unit_price * item.quantity).toLocaleString()}
              </span>
              {canReturn ? (
                <button
                  type="button"
                  onClick={() => setReturningItemId(item.id)}
                  className="text-xs font-bold text-accent"
                >
                  Return
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {returningItemId ? (
        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-surface-alt p-3.5">
          <textarea
            placeholder="Why are you returning this item?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!reason.trim() || returnMutation.isPending}
              onClick={() => returnMutation.mutate(returningItemId)}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {returnMutation.isPending ? "Submitting…" : "Submit return request"}
            </button>
            <button
              type="button"
              onClick={() => setReturningItemId(null)}
              className="text-xs font-bold text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex justify-between border-t border-[#F1EAE6] pt-4 text-sm font-bold">
        <span className="text-ink">Total</span>
        <span className="text-accent">Rs. {order.total.toLocaleString()}</span>
      </div>
    </div>
  );
}
