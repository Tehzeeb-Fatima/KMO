"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getOrderById } from "@kmo/shared/api";
import { Button } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<p className="p-10 text-sm text-muted">Loading…</p>}>
      <RequireAuth allowedRoles={["customer"]}>
        <OrderConfirmationContent />
      </RequireAuth>
    </Suspense>
  );
}

function OrderConfirmationContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const orderIds = (searchParams.get("orders") ?? "").split(",").filter(Boolean);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["confirmation-orders", orderIds],
    queryFn: async () => {
      const results = await Promise.all(orderIds.map((id) => getOrderById(supabase, id)));
      return results.filter((o): o is NonNullable<typeof o> => !!o);
    },
    enabled: orderIds.length > 0,
  });

  if (isLoading) return <p className="p-10 text-sm text-muted">Loading…</p>;

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <h1 className="text-xl font-bold text-ink">Order not found</h1>
      </div>
    );
  }

  const total = orders.reduce((sum, o) => sum + o.total, 0);
  const primary = orders[0];
  const paymentLabel =
    { cod: "Cash on delivery", card: "Debit / credit card", jazzcash: "JazzCash / Easypaisa", easypaisa: "JazzCash / Easypaisa" }[
      primary.payment_method
    ] ?? primary.payment_method;

  return (
    <div className="mx-auto flex max-w-[560px] flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-success-tint text-[32px] text-success">
        ✓
      </div>
      <h1 className="mt-5 max-w-[520px] text-[26px] font-extrabold leading-[1.35] tracking-[-0.03em] text-ink">
        Thank you! Your order is confirmed.
      </h1>
      <p className="mt-3 max-w-[440px] text-sm leading-[1.6] text-muted">
        {orders.length === 1
          ? `Order #${primary.order_number} has been placed. You'll pay Rs. ${total.toLocaleString()} on delivery. Expect it within 1–2 working days.`
          : `Orders ${orders.map((o) => `#${o.order_number}`).join(", ")} have been placed across ${orders.length} vendors. You'll pay Rs. ${total.toLocaleString()} total on delivery.`}
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-9 rounded-xl border border-border bg-surface px-[30px] py-[22px]">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-table">Order number</span>
          <span className="text-sm font-bold text-ink-dark">
            {orders.map((o) => o.order_number).join(", ")}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-table">Payment</span>
          <span className="text-sm font-bold text-ink-dark">{paymentLabel}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-table">Estimated delivery</span>
          <span className="text-sm font-bold text-ink-dark">1–2 working days</span>
        </div>
      </div>

      {user?.is_anonymous ? (
        <p className="mt-4 max-w-[440px] rounded-lg bg-accent-tint px-4 py-3 text-[12.5px] leading-[1.6] text-ink-dark">
          Check your email and confirm it to activate your account — you can then set a password
          and log in anytime to track this order.
        </p>
      ) : null}

      <div className="mt-4 flex gap-3">
        <Link href="/account/orders">
          <Button variant="secondary">Track my order</Button>
        </Link>
        <Link href="/search">
          <Button variant="primary">Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}
