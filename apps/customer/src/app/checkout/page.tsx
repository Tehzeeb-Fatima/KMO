"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAddress, listAddresses, listCartItems, placeOrder, previewCoupon } from "@kmo/shared/api";
import type { PaymentMethod } from "@kmo/shared/types";
import { Button } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; sub: string }[] = [
  { value: "cod", label: "Cash on delivery", sub: "Pay the rider when your order arrives" },
  { value: "card", label: "Debit / credit card", sub: "Visa, Mastercard, all Pakistani banks" },
  { value: "jazzcash", label: "JazzCash / Easypaisa", sub: "Pay via mobile wallet" },
];

export default function CheckoutPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <CheckoutContent />
    </RequireAuth>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items } = useQuery({ queryKey: ["cart"], queryFn: () => listCartItems(supabase) });
  const { data: addresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => listAddresses(supabase),
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [area, setArea] = useState("");

  const isGuest = !!user?.is_anonymous;
  const [email, setEmail] = useState(user?.email ?? "");

  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const { data: coupon } = useQuery({
    queryKey: ["coupon", appliedCode],
    queryFn: () => previewCoupon(supabase, appliedCode!),
    enabled: !!appliedCode,
  });

  function applyCoupon() {
    setCouponError(null);
    if (!couponInput.trim()) return;
    setAppliedCode(couponInput.trim().toUpperCase());
  }

  useEffect(() => {
    if (appliedCode && coupon === null) {
      setCouponError("That coupon code isn't valid or has expired.");
      setAppliedCode(null);
    }
  }, [appliedCode, coupon]);

  const effectiveAddressId = selectedAddressId ?? addresses?.[0]?.id ?? null;

  const addAddressMutation = useMutation({
    mutationFn: () =>
      createAddress(supabase, {
        customer_id: user!.id,
        full_name: fullName,
        phone,
        address_line: addressLine,
        area,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setSelectedAddressId(created.id);
      setAddingAddress(false);
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveAddressId) throw new Error("Choose a delivery address.");

      if (isGuest) {
        const trimmedEmail = email.trim();
        if (trimmedEmail) {
          const { error: linkError } = await supabase.auth.updateUser(
            {
              email: trimmedEmail,
              data: { pending_order_note: "Order placed as a guest — set a password to track it anytime." },
            },
            { emailRedirectTo: `${window.location.origin}/account/orders` },
          );
          if (linkError) {
            throw new Error(
              linkError.message.toLowerCase().includes("already")
                ? "This email is already registered. Please sign in first, then check out."
                : linkError.message,
            );
          }
        }
      }

      return placeOrder(supabase, {
        addressId: effectiveAddressId,
        paymentMethod,
        couponCode: coupon?.code,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      router.push(`/order-confirmation?orders=${result.orders.map((o) => o.id).join(",")}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const subtotal =
    items?.reduce((sum, item) => {
      const price = item.product_variants?.price_override ?? item.products.price;
      return sum + price * item.quantity;
    }, 0) ?? 0;

  const vendorCount = new Set(items?.map((i) => i.products.vendor_id)).size;
  const deliveryFee = (subtotal >= 2500 ? 0 : 120) * Math.max(vendorCount, 1);

  const couponVendorSubtotal =
    coupon && items
      ? items
          .filter((i) => i.products.vendor_id === coupon.vendor_id)
          .reduce((sum, item) => sum + (item.product_variants?.price_override ?? item.products.price) * item.quantity, 0)
      : 0;
  const discount = coupon
    ? Math.min(
        couponVendorSubtotal,
        coupon.discount_type === "percentage"
          ? Math.round(couponVendorSubtotal * (coupon.amount / 100) * 100) / 100
          : coupon.amount,
      )
    : 0;

  const total = subtotal + deliveryFee - discount;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-10">
      <StepIndicator />

      <div className="mt-6 grid grid-cols-1 gap-[26px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-base font-bold tracking-[-0.02em] text-ink">
              Contact email <span className="font-medium text-muted-table">(optional)</span>
            </h2>
            {isGuest ? (
              <>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                />
                <p className="text-[12px] text-muted">
                  Add your email if you&rsquo;d like order updates and a link to set a password
                  so you can track this order anytime. You can check out without it.
                </p>
              </>
            ) : (
              <p className="text-[13.5px] text-ink-dark">{user?.email}</p>
            )}
          </section>

          <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-base font-bold tracking-[-0.02em] text-ink">Delivery address</h2>

            {addresses && addresses.length > 0 && !addingAddress ? (
              <div className="flex flex-col gap-2.5">
                {addresses.map((addr) => {
                  const selected = effectiveAddressId === addr.id;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedAddressId(addr.id)}
                      className="rounded-[9px] p-3.5 text-left text-[13px]"
                      style={
                        selected
                          ? { border: "1.5px solid var(--color-accent)", background: "var(--color-accent-tint)" }
                          : { border: "1px solid var(--color-border)" }
                      }
                    >
                      <p className="font-bold text-ink-dark">
                        {addr.full_name} · {addr.phone}
                      </p>
                      <p className="text-muted">
                        {addr.address_line}
                        {addr.area ? `, ${addr.area}` : ""}, {addr.city}
                      </p>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setAddingAddress(true)}
                  className="w-fit text-[12.5px] font-bold text-accent"
                >
                  + Add a new address
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                  <input
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </div>
                <input
                  placeholder="Street address, house / flat number"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                />
                <input
                  placeholder="Area / town"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                />
                <Button
                  variant="secondary"
                  className="w-fit"
                  disabled={addAddressMutation.isPending || !fullName || !phone || !addressLine}
                  onClick={() => addAddressMutation.mutate()}
                >
                  {addAddressMutation.isPending ? "Saving…" : "Save address"}
                </Button>
                {addresses && addresses.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setAddingAddress(false)}
                    className="w-fit text-[12.5px] font-bold text-primary"
                  >
                    Use a saved address instead
                  </button>
                ) : null}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-base font-bold tracking-[-0.02em] text-ink">Payment method</h2>
            <div className="flex flex-col gap-2.5">
              {PAYMENT_OPTIONS.map((opt) => {
                const selected = paymentMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className="flex items-center gap-3 rounded-[9px] p-3.5 text-left"
                    style={
                      selected
                        ? { border: "1.5px solid var(--color-accent)", background: "var(--color-accent-tint)" }
                        : { border: "1px solid var(--color-border)" }
                    }
                  >
                    <span
                      className="h-[18px] w-[18px] shrink-0 rounded-full"
                      style={{
                        border: selected
                          ? "5px solid var(--color-accent)"
                          : "1.5px solid var(--color-border)",
                      }}
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13.5px] font-bold text-ink-dark">{opt.label}</span>
                      <span className="text-[11.5px] text-muted">{opt.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 lg:sticky lg:top-6 lg:self-start">
          <p className="text-[17px] font-bold text-ink">Order summary</p>
          <div className="flex flex-col gap-2 border-t border-[#F1EAE6] pt-3.5">
            {items?.map((item) => (
              <div key={item.id} className="flex justify-between text-[12.5px] text-muted">
                <span>
                  {item.products.name} × {item.quantity}
                </span>
                <span className="font-semibold text-ink-dark">
                  Rs.{" "}
                  {(
                    (item.product_variants?.price_override ?? item.products.price) * item.quantity
                  ).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[13.5px]">
            <span className="text-muted">Delivery</span>
            <span className="font-semibold text-success">
              {deliveryFee === 0 ? "Free" : `Rs. ${deliveryFee.toLocaleString()}`}
            </span>
          </div>

          {coupon ? (
            <div className="flex justify-between text-[13.5px]">
              <span className="text-muted">
                Coupon <span className="font-mono font-bold text-primary">{coupon.code}</span>
              </span>
              <span className="font-semibold text-accent">− Rs. {discount.toLocaleString()}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-bold text-primary"
              >
                Apply
              </button>
            </div>
          )}
          {couponError ? <p className="text-xs text-danger">{couponError}</p> : null}

          <div className="flex justify-between border-t border-[#F1EAE6] pt-3.5 text-lg font-extrabold">
            <span className="text-ink">Total</span>
            <span className="text-accent">Rs. {total.toLocaleString()}</span>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            className="w-full"
            disabled={!effectiveAddressId || !items?.length || placeOrderMutation.isPending}
            onClick={() => {
              setError(null);
              placeOrderMutation.mutate();
            }}
          >
            {placeOrderMutation.isPending ? "Placing order…" : "Place order"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepIndicator() {
  const steps = [
    { n: 1, label: "Delivery", done: true },
    { n: 2, label: "Payment", done: true },
    { n: 3, label: "Review", done: false },
  ];
  return (
    <div className="flex items-center gap-2.5">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
              style={
                step.done
                  ? { background: "var(--color-accent)", color: "#fff" }
                  : { background: "var(--color-border)", color: "var(--color-muted-table)" }
              }
            >
              {step.n}
            </span>
            <span
              className="text-[13px] font-bold"
              style={{ color: step.done ? "var(--color-ink-dark)" : "var(--color-muted-table)" }}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 ? <span className="h-0.5 w-9 bg-border" /> : null}
        </div>
      ))}
    </div>
  );
}
