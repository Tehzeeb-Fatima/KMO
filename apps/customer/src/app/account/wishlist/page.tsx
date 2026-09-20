"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listWishlist, removeFromWishlist } from "@kmo/shared/api";
import { ConfirmDialog, ProductCard } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";

export default function WishlistPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <WishlistContent />
    </RequireAuth>
  );
}

function WishlistContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => listWishlist(supabase),
  });

  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(supabase, user!.id, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setPendingRemoveId(null);
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
        Your wishlist
      </h1>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !items || items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          Nothing saved yet — tap the heart on a product to add it here.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <ProductCard
                href={`/product/${item.products.slug}`}
                LinkComponent={Link}
                imageUrl={item.products.product_images[0]?.url}
                vendorName={item.products.vendors?.store_name}
                name={item.products.name}
                price={item.products.price}
                compareAtPrice={item.products.compare_at_price}
              />
              <button
                type="button"
                onClick={() => setPendingRemoveId(item.product_id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-danger shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRemoveId}
        title="Remove from wishlist?"
        confirmLabel="Remove"
        loading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate(pendingRemoveId!)}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}
