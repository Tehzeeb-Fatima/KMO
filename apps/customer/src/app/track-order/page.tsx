"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { ORDER_STATUS_META } from "@kmo/shared/lib";
import { StatusBadge, Button } from "@kmo/shared/ui";

interface TrackedOrder {
  order_number: string;
  status: keyof typeof ORDER_STATUS_META;
  total: number;
  payment_method: string;
  created_at: string;
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    const { data, error } = await supabase.rpc("track_order", {
      p_order_number: orderNumber,
      p_email: email,
    });
    setSubmitting(false);
    setSearched(true);
    if (error) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setResult((data?.[0] as TrackedOrder | undefined) ?? null);
  }

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">Track my order</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the order number from your confirmation and the email you used at checkout.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-dark">
          Order number
          <input
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. KMO-2026-000123"
            className="rounded-md border border-border px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-dark">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-border px-3 py-2 text-sm font-normal"
          />
        </label>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Checking…" : "Track order"}
        </Button>
      </form>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {searched && !submitting && !error && !result ? (
        <p className="mt-4 text-sm text-muted">
          No order found for that number and email. Check both and try again.
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink-dark">#{result.order_number}</span>
            <StatusBadge variant={ORDER_STATUS_META[result.status].variant}>
              {ORDER_STATUS_META[result.status].label}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted">
            Placed on {new Date(result.created_at).toLocaleDateString()} · Total Rs. {result.total.toLocaleString()} ·{" "}
            {result.payment_method.toUpperCase()}
          </p>
        </div>
      ) : null}
    </main>
  );
}
