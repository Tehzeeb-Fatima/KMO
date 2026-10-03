"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ShoppingCart } from "lucide-react";
import { addToWishlist, listWishlist, removeFromWishlist, addToCart } from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";
import { ensureCustomerId } from "@/lib/ensure-customer-id";

function useWishlistIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wishlist-ids", user?.id],
    queryFn: async () => (await listWishlist(supabase)).map((w) => w.product_id),
    enabled: !!user,
  });
}

export function WishlistHeart({ productId }: { productId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: ids } = useWishlistIds();
  const saved = ids?.includes(productId) ?? false;

  const toggle = useMutation({
    mutationFn: async () => {
      const customerId = await ensureCustomerId(user);
      if (saved) await removeFromWishlist(supabase, customerId, productId);
      else await addToWishlist(supabase, customerId, productId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist-ids"] }),
  });

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          router.push("/login");
          return;
        }
        toggle.mutate();
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
    >
      <Heart
        className="h-4 w-4"
        strokeWidth={2}
        style={saved ? { color: "var(--color-accent)", fill: "var(--color-accent)" } : { color: "var(--color-primary)" }}
      />
    </button>
  );
}

/** Adds the given variant (or the base product when variantId is null). */
export function AddToCartButton({
  productId,
  variantId,
  outOfStock,
}: {
  productId: string;
  variantId: string | null;
  outOfStock: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: async () => {
      const customerId = await ensureCustomerId(user);
      return addToCart(supabase, customerId, productId, variantId, 1);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const base =
    "flex w-full items-center justify-center gap-2 rounded-[7px] px-3 py-2.5 text-[12.5px] font-bold disabled:opacity-60";

  if (outOfStock) {
    return (
      <button type="button" disabled className={`${base} bg-[#9DBFB0] text-white`}>
        Out of stock
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={add.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          router.push("/login");
          return;
        }
        add.mutate();
      }}
      className={`${base} bg-[#1F6B4F] text-white`}
    >
      <ShoppingCart className="h-3.5 w-3.5" />
      {add.isSuccess ? "Added" : add.isPending ? "Adding…" : "Add to cart"}
    </button>
  );
}
