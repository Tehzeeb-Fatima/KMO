"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  followVendor,
  getOrCreateConversation,
  getVendorBySlug,
  isFollowingVendor,
  listPublishedProducts,
  unfollowVendor,
} from "@kmo/shared/api";
import { PillTabs, ProductCard } from "@kmo/shared/ui";
import { WEEK_DAYS, type BusinessHours, type VendorPolicies } from "@kmo/shared/types";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";
import { ensureCustomerId } from "@/lib/ensure-customer-id";

type Tab = "products" | "policies" | "reviews" | "about";

export default function StoreClient() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("products");

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", params.slug],
    queryFn: () => getVendorBySlug(supabase, params.slug),
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following-vendor", vendor?.id, user?.id],
    queryFn: () => isFollowingVendor(supabase, user!.id, vendor!.id),
    enabled: !!vendor && !!user && !user.is_anonymous,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!vendor || !user) throw new Error("Not ready");
      if (isFollowing) {
        await unfollowVendor(supabase, user.id, vendor.id);
      } else {
        await followVendor(supabase, user.id, vendor.id);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["is-following-vendor", vendor?.id] }),
  });

  const PENDING_FOLLOW_KEY = "kmo_pending_follow_vendor";

  function handleFollowClick() {
    if (!vendor) return;
    if (!user || user.is_anonymous) {
      sessionStorage.setItem(PENDING_FOLLOW_KEY, vendor.id);
      router.push(`/login?next=${encodeURIComponent(`/store/${params.slug}`)}`);
      return;
    }
    followMutation.mutate();
  }

  // Coming back from a login the "Follow store" button triggered — finish
  // the follow automatically instead of making the user click it again.
  useEffect(() => {
    if (!vendor || !user || user.is_anonymous) return;
    const pendingVendorId = sessionStorage.getItem(PENDING_FOLLOW_KEY);
    if (pendingVendorId === vendor.id) {
      sessionStorage.removeItem(PENDING_FOLLOW_KEY);
      followVendor(supabase, user.id, vendor.id).then(() =>
        queryClient.invalidateQueries({ queryKey: ["is-following-vendor", vendor.id] }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id, user?.id, user?.is_anonymous]);

  const chatMutation = useMutation({
    mutationFn: async () => {
      if (!vendor) throw new Error("Not ready");
      const customerId = await ensureCustomerId(user);
      return getOrCreateConversation(supabase, customerId, vendor.id);
    },
    onSuccess: (conversation) => router.push(`/account/messages?c=${conversation.id}`),
  });

  function handleChat() {
    chatMutation.mutate();
  }

  if (isLoading) {
    return <p className="p-10 text-sm text-muted">Loading store…</p>;
  }

  if (!vendor) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <h1 className="text-xl font-bold text-ink">Store not found</h1>
        <p className="mt-2 text-sm text-muted">
          This store doesn&rsquo;t exist, or isn&rsquo;t approved yet.
        </p>
      </div>
    );
  }

  const todayKey = WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].key;
  const todayHours = vendor.business_hours?.[todayKey];

  return (
    <div className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <nav className="mb-4 text-[12.5px] text-muted">
        Home / Vendors /{" "}
        <span className="font-bold text-ink-dark">{vendor.store_name}</span>
      </nav>

      <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
        {/* cover banner */}
        <div
          className="h-[100px] w-full sm:h-[190px]"
          style={{
            backgroundImage: vendor.cover_url
              ? `url(${vendor.cover_url})`
              : "repeating-linear-gradient(135deg,#5C3178 0 10px,#4A2266 10px 20px)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* identity row */}
        <div className="grid gap-4 px-4 pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-[30px] sm:px-[30px]">
          <div className="-mt-[30px] flex flex-col gap-4 sm:-mt-10 sm:flex-row">
            <span
              className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-white ring-4 ring-white sm:h-24 sm:w-24 sm:text-xl"
              style={
                vendor.logo_url
                  ? {
                      backgroundImage: `url(${vendor.logo_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {!vendor.logo_url && initials(vendor.store_name)}
            </span>

            <div className="flex flex-col gap-2 pt-0 sm:pt-12">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink sm:text-[25px] sm:tracking-[-0.032em]">
                  {vendor.store_name}
                </h1>
                <span className="rounded-[5px] bg-danger-tint px-[7px] py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-danger sm:text-[9.5px]">
                  <span className="hidden sm:inline">Verified vendor</span>
                  <span className="sm:hidden">Verified</span>
                </span>
              </div>

              {vendor.description ? (
                <p className="max-w-[620px] text-[13px] leading-relaxed text-muted sm:text-[13.5px] sm:leading-[1.6]">
                  {vendor.description}
                </p>
              ) : null}

              <div className="flex items-center gap-[18px] text-[12.5px] text-muted">
                {vendor.area ? <span>Ships from {vendor.area}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:min-w-[232px]">
            <HoursPill
              onVacation={vendor.is_on_vacation}
              sub={vendor.is_on_vacation ? undefined : todayHours}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleFollowClick}
                disabled={followMutation.isPending}
                className="flex-1 rounded-lg px-4 py-[11px] text-sm font-bold disabled:opacity-60"
                style={
                  isFollowing
                    ? { border: "1px solid var(--color-border)", color: "var(--color-primary)", background: "#fff" }
                    : { background: "var(--color-accent)", color: "#fff" }
                }
              >
                {isFollowing ? "Following ✓" : "Follow store"}
              </button>
              <button
                type="button"
                onClick={handleChat}
                disabled={chatMutation.isPending}
                className="flex-1 rounded-lg border border-border px-4 py-[11px] text-sm font-bold text-primary"
              >
                Chat
              </button>
            </div>
          </div>
        </div>

        {vendor.is_on_vacation ? (
          <div className="px-4 pt-[14px] sm:px-[40px]">
            <div className="flex items-center gap-[13px] rounded-[9px] border border-[#EFCBBB] bg-danger-tint px-4 py-[13px] sm:px-5 sm:py-[15px]">
              <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-accent" />
              <p className="text-[13.5px] leading-[1.55] text-[#7A3018]">
                <strong className="font-bold">Store is on vacation.</strong>{" "}
                {vendor.vacation_message ||
                  "You can still browse the catalogue, but new orders are paused."}
              </p>
            </div>
          </div>
        ) : null}

        {/* tabs */}
        <div className="overflow-x-auto px-4 pt-5 sm:px-10">
          <PillTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "products", label: "Products" },
              { value: "policies", label: "Store policies" },
              { value: "reviews", label: "Reviews" },
              { value: "about", label: "About" },
            ]}
          />
        </div>

        <div className="px-4 py-6 sm:px-10 sm:py-8">
          {tab === "products" ? <ProductsTab vendorId={vendor.id} /> : null}
          {tab === "policies" ? <PoliciesTab policies={vendor.policies} /> : null}
          {tab === "reviews" ? <ReviewsTab /> : null}
          {tab === "about" ? (
            <AboutTab description={vendor.description} businessHours={vendor.business_hours} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function HoursPill({ onVacation, sub }: { onVacation: boolean; sub?: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3 py-2"
      style={{
        background: onVacation ? "var(--color-danger-tint)" : "var(--color-success-tint)",
        borderColor: onVacation ? "#EFCBBB" : "var(--color-success-border)",
      }}
    >
      <span
        className="h-[9px] w-[9px] shrink-0 rounded-full"
        style={{ background: onVacation ? "var(--color-accent)" : "var(--color-success)" }}
      />
      <span className="text-xs">
        <span className="font-bold text-ink">
          {onVacation ? "On vacation" : "Open now"}
        </span>
        {sub ? <span className="text-muted"> · {sub}</span> : null}
      </span>
    </div>
  );
}

function ProductsTab({ vendorId }: { vendorId: string }) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["vendor-products", vendorId],
    queryFn: () => listPublishedProducts(supabase, { vendorId }),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-muted">
          {isLoading ? "Loading…" : `Showing ${products?.length ?? 0} products`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        {isLoading ? (
          <div className="col-span-full grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg bg-surface-alt" />
            ))}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
            This store hasn&rsquo;t listed any products yet.
          </div>
        ) : (
          products.map((p) => (
            <ProductCard
              key={p.id}
              href={`/product/${p.slug}`}
              LinkComponent={Link}
              imageUrl={p.product_images[0]?.url}
              vendorName={p.vendors?.store_name}
              name={p.name}
              price={p.price}
              compareAtPrice={p.compare_at_price}
              has360={p.has_360_view}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PoliciesTab({ policies }: { policies: VendorPolicies }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PolicyCard title="Shipping policy" body={policies?.shipping} />
      <PolicyCard title="Refund & returns policy" body={policies?.refunds} />
    </div>
  );
}

function PolicyCard({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-dark">
        {body || "Not provided yet."}
      </p>
    </div>
  );
}

function ReviewsTab() {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
      No reviews yet.
    </div>
  );
}

function AboutTab({
  description,
  businessHours,
}: {
  description: string | null;
  businessHours: BusinessHours;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_330px]">
      <div>
        <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">About the store</h2>
        <p className="mt-3 max-w-[640px] text-sm leading-[1.7] text-ink-dark">
          {description || "This store hasn't added a description yet."}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="text-[15px] font-bold text-ink">Store hours</p>
        <div className="mt-2 flex flex-col">
          {WEEK_DAYS.map((day) => (
            <div
              key={day.key}
              className="flex justify-between border-t border-[#F1EAE6] py-[10px] text-[13px] first:border-t-0"
            >
              <span className="text-muted">{day.label}</span>
              <span className="font-medium text-ink-dark">
                {businessHours?.[day.key] || "Closed"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
