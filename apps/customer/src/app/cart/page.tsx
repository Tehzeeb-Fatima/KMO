"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCartItems, removeCartItem, updateCartItemQuantity } from "@kmo/shared/api";
import { Breadcrumbs, Button, ConfirmDialog } from "@kmo/shared/ui";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";

export default function CartPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <CartContent />
    </RequireAuth>
  );
}

function CartContent() {
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => listCartItems(supabase),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updateCartItemQuantity(supabase, id, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const removeMutation = useMutation({
    mutationFn: (id: string) => removeCartItem(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setPendingRemoveId(null);
    },
  });

  const groups = useMemo(() => {
    if (!items) return [];
    const map = new Map<string, { vendorName: string; items: typeof items }>();
    for (const item of items) {
      const vendorId = item.products.vendor_id;
      const vendorName = item.products.vendors?.store_name ?? "Store";
      const entry = map.get(vendorId) ?? { vendorName, items: [] };
      entry.items.push(item);
      map.set(vendorId, entry);
    }
    return Array.from(map.values());
  }, [items]);

  const subtotal = useMemo(() => {
    if (!items) return 0;
    return items.reduce((sum, item) => {
      const price = item.product_variants?.price_override ?? item.products.price;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  if (isLoading) return <p className="p-10 text-sm text-muted">Loading cart…</p>;

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[600px] flex-1 flex-col items-center justify-center p-10 text-center">
        <h1 className="text-xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted">Browse the catalogue to find something you like.</p>
        <Link href="/search" className="mt-4">
          <Button>Start shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <Breadcrumbs
        LinkComponent={Link}
        items={[{ label: "Home", href: "/" }, { label: "Your cart" }]}
      />
      <h1 className="mb-5 text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
        Your cart · {items.length} item{items.length === 1 ? "" : "s"}
      </h1>

      <div className="grid grid-cols-1 gap-[26px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          {groups.map((group) => {
            const groupSubtotal = group.items.reduce((sum, item) => {
              const price = item.product_variants?.price_override ?? item.products.price;
              return sum + price * item.quantity;
            }, 0);
            return (
              <div key={group.vendorName} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-table">
                    {group.vendorName}
                  </span>
                  <span className="text-[12.5px] text-muted">
                    Subtotal:{" "}
                    <strong className="text-ink-dark">Rs. {groupSubtotal.toLocaleString()}</strong>
                  </span>
                </div>
                {group.items.map((item) => {
                  const price = item.product_variants?.price_override ?? item.products.price;
                  const image = item.products.product_images
                    ?.slice()
                    .sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[72px_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto_auto] sm:grid-rows-1 sm:gap-[18px] sm:p-[18px]"
                    >
                      <div
                        className="row-span-2 h-[72px] w-[72px] rounded-[9px] sm:row-span-1 sm:h-[88px] sm:w-[88px]"
                        style={{
                          background: image
                            ? `url(${image}) center/cover`
                            : "repeating-linear-gradient(135deg,#F3ECE8 0 7px,#E9DFD9 7px 14px)",
                        }}
                      />
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-[14.5px] font-semibold text-ink-dark">
                          {item.products.name}
                        </span>
                        {item.product_variants ? (
                          <span className="text-xs text-muted">
                            {item.product_variants.option_name}: {item.product_variants.option_value}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setPendingRemoveId(item.id)}
                          className="w-fit text-xs font-bold text-accent"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="col-start-2 flex min-w-0 items-center justify-between gap-3 sm:contents">
                        <div className="flex items-center overflow-hidden rounded-full border border-border">
                          <button
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({ id: item.id, quantity: Math.max(1, item.quantity - 1) })
                            }
                            className="cursor-pointer px-3 py-2 text-sm text-primary"
                          >
                            −
                          </button>
                          <span className="min-w-[26px] text-center text-[13px] font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({ id: item.id, quantity: item.quantity + 1 })
                            }
                            className="cursor-pointer px-3 py-2 text-sm text-primary"
                          >
                            +
                          </button>
                        </div>
                        <span className="whitespace-nowrap text-lg font-extrabold tracking-[-0.025em] text-primary">
                          Rs. {(price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 lg:sticky lg:top-6 lg:self-start">
          <p className="text-[17px] font-bold tracking-[-0.02em] text-ink">Order summary</p>
          <div className="flex justify-between border-t border-[#F1EAE6] pt-3.5 text-[13.5px]">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold text-ink-dark">Rs. {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[13.5px]">
            <span className="text-muted">Delivery</span>
            <span className="font-semibold text-success">
              {subtotal >= 2500 ? "Free" : "Rs. 120"}
            </span>
          </div>
          <div className="flex justify-between border-t border-[#F1EAE6] pt-3.5 text-lg font-extrabold">
            <span className="text-ink">Total</span>
            <span className="text-accent">
              Rs. {(subtotal + (subtotal >= 2500 ? 0 : 120) * groups.length).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary-tint px-3 py-2.5">
            <span className="rounded bg-white px-1.5 py-1 font-mono text-[9.5px] tracking-[0.08em] text-primary">
              COD
            </span>
            <span className="text-xs text-primary">Cash on delivery available</span>
          </div>
          <Link href="/checkout">
            <Button className="w-full">Proceed to checkout</Button>
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingRemoveId}
        title="Remove this item?"
        message="It will be taken out of your cart."
        confirmLabel="Remove"
        loading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate(pendingRemoveId!)}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}
