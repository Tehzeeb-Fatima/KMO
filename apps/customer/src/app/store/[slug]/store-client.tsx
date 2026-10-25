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
  listActivePromotions,
  listPublishedProducts,
  toPricingPromotions,
  unfollowVendor,
} from "@kmo/shared/api";
import { cardPricing, colourCards, mainImageUrl } from "@kmo/shared/lib";
import { Breadcrumbs, PillTabs, ProductCard } from "@kmo/shared/ui";
import { WEEK_DAYS, type BusinessHours, type VendorPolicies } from "@kmo/shared/types";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { StorePageSkeleton } from "@/components/page-loader";
import { DEFAULT_VENDOR_BANNER } from "@/lib/vendor-banner";

type Tab = "products" | "policies" | "reviews" | "about";

export default function StoreClient() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("products");

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", params.slug],
    queryFn: () => getVendorBySlug(supabase, params.slug),
  });

  // Same query as the Products tab, so the count and the grid share one fetch.
  const { data: vendorProducts } = useQuery({
    queryKey: ["vendor-products", vendor?.id],
    queryFn: () => listPublishedProducts(supabase, { vendorId: vendor!.id }),
    enabled: !!vendor,
  });
  const productCount = storeCards(vendorProducts).length;

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

  const PENDING_CHAT_KEY = "kmo_pending_chat_vendor";

  const chatMutation = useMutation({
    mutationFn: async () => {
      if (!vendor || !user) throw new Error("Not ready");
      return getOrCreateConversation(supabase, user.id, vendor.id);
    },
    onSuccess: (conversation) => router.push(`/account/messages?c=${conversation.id}`),
  });

  function handleChat() {
    if (!vendor) return;
    if (!user || user.is_anonymous) {
      sessionStorage.setItem(PENDING_CHAT_KEY, vendor.id);
      router.push(`/login?next=${encodeURIComponent(`/store/${params.slug}`)}`);
      return;
    }
    chatMutation.mutate();
  }

  // Coming back from a login the "Chat" button triggered — open the chat
  // automatically instead of making the customer click it again.
  useEffect(() => {
    if (!vendor || !user || user.is_anonymous) return;
    const pendingVendorId = sessionStorage.getItem(PENDING_CHAT_KEY);
    if (pendingVendorId === vendor.id) {
      sessionStorage.removeItem(PENDING_CHAT_KEY);
      chatMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id, user?.id, user?.is_anonymous]);

  if (isLoading) {
    return <StorePageSkeleton />;
  }

  if (!vendor) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <h1 className="text-xl font-bold text-ink">{t.store.storeNotFound}</h1>
        <p className="mt-2 text-[15.5px] text-muted">{t.store.storeNotFoundHint}</p>
      </div>
    );
  }

  const todayKey = WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].key;
  const todayHours = vendor.business_hours?.[todayKey];

  return (
    <div className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <Breadcrumbs
        LinkComponent={Link}
        items={[
          { label: t.common.home, href: "/" },
          { label: t.vendorsPage.title, href: "/vendors" },
          { label: vendor.store_name },
        ]}
      />

      <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
        {/* cover banner */}
        <div
          className="h-[100px] w-full sm:h-[190px]"
          style={{
            backgroundImage: `url(${vendor.cover_url ?? DEFAULT_VENDOR_BANNER})`,
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
                <span className="rounded-[5px] bg-danger-tint px-[7px] py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-danger sm:text-[11px]">
                  <span className="hidden sm:inline">{t.store.verifiedVendor}</span>
                  <span className="sm:hidden">{t.store.verified}</span>
                </span>
              </div>

              {vendor.description ? (
                // Opening line only; the full text is on the About tab.
                <p className="line-clamp-2 max-w-[620px] text-[15px] leading-relaxed text-muted sm:text-[15.5px] sm:leading-[1.6]">
                  {vendor.description.trim().split("\n")[0]}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-[14px] text-muted">
                {productCount ? (
                  <span>
                    <strong className="font-bold text-ink-dark">{productCount}</strong> {t.store.productsWord}
                  </span>
                ) : null}
                {vendor.area ? <span>{t.store.shipsFrom} {vendor.area}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:w-[290px] sm:items-end">
            <HoursPill
              onVacation={vendor.is_on_vacation}
              sub={vendor.is_on_vacation ? undefined : todayHours}
            />
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={handleFollowClick}
                disabled={followMutation.isPending}
                className="flex-1 whitespace-nowrap rounded-lg px-3 py-[11px] text-[15.5px] font-bold disabled:opacity-60"
                style={
                  isFollowing
                    ? { border: "1px solid var(--color-border)", color: "var(--color-primary)", background: "#fff" }
                    : { background: "var(--color-accent)", color: "#fff" }
                }
              >
                {isFollowing ? t.store.followingCheck : t.store.followStore}
              </button>
              <button
                type="button"
                onClick={handleChat}
                disabled={chatMutation.isPending}
                className="flex-1 whitespace-nowrap rounded-lg border border-border px-3 py-[11px] text-[15.5px] font-bold text-primary"
              >
                {t.store.chat}
              </button>
            </div>
          </div>
        </div>

        {vendor.is_on_vacation ? (
          <div className="px-4 pt-[14px] sm:px-[40px]">
            <div className="flex items-center gap-[13px] rounded-[9px] border border-[#EFCBBB] bg-danger-tint px-4 py-[13px] sm:px-5 sm:py-[15px]">
              <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-accent" />
              <p className="text-[15.5px] leading-[1.55] text-[#7A3018]">
                <strong className="font-bold">{t.store.storeOnVacation}</strong>{" "}
                {vendor.vacation_message || t.store.vacationDefaultMessage}
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
              { value: "products", label: t.store.tabProducts },
              { value: "policies", label: t.store.tabPolicies },
              { value: "reviews", label: t.store.tabReviews },
              { value: "about", label: t.store.tabAbout },
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
  const { t } = useLanguage();
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
      <span className="text-[13.5px]">
        <span className="font-bold text-ink">
          {onVacation ? t.store.onVacation : t.store.openNow}
        </span>
        {sub ? <span className="text-muted"> · {sub}</span> : null}
      </span>
    </div>
  );
}

/** Each colour with its own photo gets its own card, so the range shows at a glance. */
function storeCards(products: Awaited<ReturnType<typeof listPublishedProducts>> | undefined) {
  return (products ?? []).flatMap((p) => {
    const colours = colourCards(p.product_variants, p.product_images);
    return colours.length
      ? colours.map((c) => ({ p, colour: c.colour as string | null, imageUrl: c.imageUrl as string | undefined }))
      : [{ p, colour: null as string | null, imageUrl: mainImageUrl(p.product_images) }];
  });
}

function ProductsTab({ vendorId }: { vendorId: string }) {
  const { t } = useLanguage();
  const { data: products, isLoading } = useQuery({
    queryKey: ["vendor-products", vendorId],
    queryFn: () => listPublishedProducts(supabase, { vendorId }),
  });
  const { data: activePromotions } = useQuery({
    queryKey: ["active-promotions-store"],
    queryFn: () => listActivePromotions(supabase, 100),
  });
  const pricingPromotions = toPricingPromotions(activePromotions ?? []);
  const cards = storeCards(products);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[15px] text-muted">
          {isLoading ? (
            <span className="inline-block h-4 w-32 animate-pulse rounded bg-surface-alt align-middle" />
          ) : (
            `${t.store.showingProducts} ${cards.length} ${t.store.productsWord}`
          )}
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
          <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-[15.5px] text-muted">
            {t.store.noProductsListed}
          </div>
        ) : (
          cards.map(({ p, colour, imageUrl }) => {
            const cp = cardPricing(
              { id: p.id, vendorId: p.vendor_id, categoryId: p.category_id, price: p.price, compareAtPrice: p.compare_at_price },
              pricingPromotions,
            );
            return (
              <ProductCard
                key={colour ? `${p.id}-${colour}` : p.id}
                href={colour ? `/product/${p.slug}?colour=${encodeURIComponent(colour)}` : `/product/${p.slug}`}
                LinkComponent={Link}
                imageUrl={imageUrl}
                vendorName={p.vendors?.store_name}
                name={colour ? `${p.name} – ${colour}` : p.name}
                price={cp.price}
                compareAtPrice={cp.compareAtPrice}
                promoLabel={cp.badgeText}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function PoliciesTab({ policies }: { policies: VendorPolicies }) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PolicyCard title={t.store.shippingPolicy} body={policies?.shipping} />
      <PolicyCard title={t.store.refundsPolicy} body={policies?.refunds} />
    </div>
  );
}

function PolicyCard({ title, body }: { title: string; body?: string }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-[16.5px] font-bold text-ink">{title}</p>
      <p className="mt-2 text-[15.5px] leading-relaxed text-ink-dark">
        {body || t.store.notProvidedYet}
      </p>
    </div>
  );
}

function ReviewsTab() {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center text-[15.5px] text-muted">
      {t.store.noReviewsYet}
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
  const { t } = useLanguage();
  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_330px]">
      <div>
        <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">{t.store.aboutStore}</h2>
        <p className="mt-3 max-w-[640px] whitespace-pre-line text-[15.5px] leading-[1.7] text-ink-dark">
          {description || t.store.noDescriptionYet}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="text-[16.5px] font-bold text-ink">{t.store.storeHours}</p>
        <div className="mt-2 flex flex-col">
          {WEEK_DAYS.map((day) => (
            <div
              key={day.key}
              className="flex justify-between border-t border-[#F1EAE6] py-[10px] text-[15px] first:border-t-0"
            >
              <span className="text-muted">{day.label}</span>
              <span className="font-medium text-ink-dark">
                {businessHours?.[day.key] || t.store.closed}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
