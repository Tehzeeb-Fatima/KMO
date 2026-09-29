"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  listActivePromotions,
  listCategories,
  listPublishedProducts,
  listTopCategories,
  listVendors,
  listRecentReviews,
  getSiteRatingSummary,
  submitContactMessage,
  toPricingPromotions,
  type TopCategory,
} from "@kmo/shared/api";
import { cardPricing } from "@kmo/shared/lib";
import { Countdown, ProductCard } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";

export default function Home() {
  const { t } = useLanguage();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });
  const { data: products } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => listPublishedProducts(supabase, { sort: "newest", limit: 8 }),
  });
  const { data: vendors } = useQuery({
    queryKey: ["featured-vendors"],
    queryFn: () => listVendors(supabase, { status: "approved" }),
  });
  const { data: ratingSummary } = useQuery({
    queryKey: ["site-rating-summary"],
    queryFn: () => getSiteRatingSummary(supabase),
  });
  const { data: recentReviews } = useQuery({
    queryKey: ["recent-reviews"],
    queryFn: () => listRecentReviews(supabase, 3),
  });
  const { data: promotions } = useQuery({
    queryKey: ["active-promotions"],
    queryFn: () => listActivePromotions(supabase, 6),
  });
  const { data: allActivePromotions } = useQuery({
    queryKey: ["active-promotions-pricing"],
    queryFn: () => listActivePromotions(supabase, 100),
  });
  const pricingPromotions = toPricingPromotions(allActivePromotions ?? []);
  const { data: topCategories } = useQuery({
    queryKey: ["top-categories"],
    queryFn: () => listTopCategories(supabase, 3),
  });

  const vendorOfWeek = vendors?.[0];
  const { data: vendorOfWeekProductCount } = useQuery({
    queryKey: ["vendor-product-count", vendorOfWeek?.id],
    queryFn: async () => {
      const list = await listPublishedProducts(supabase, { vendorId: vendorOfWeek!.id });
      return list.length;
    },
    enabled: !!vendorOfWeek,
  });

  return (
    <main className="flex flex-1 flex-col bg-bg">
      {/* row 1 — hero, 3 panels */}
      <section className="grid gap-4 px-4 pt-7 sm:px-10 lg:grid-cols-[1.6fr_1fr_1fr]">
        {/* panel A — headline */}
        <div className="flex min-h-[260px] flex-col justify-center gap-4 rounded-lg bg-primary p-8 sm:min-h-[300px] sm:p-[38px_34px]">
          <p className="font-mono text-[10.5px] tracking-[0.18em] text-[#E09A76]">
            {t.home.badge}
          </p>
          <h1 className="text-[32px] font-extrabold leading-[1.05] tracking-[-0.038em] text-white sm:text-[44px]">
            {t.home.titleLine1}
            <br />
            {t.home.titleLine2}
          </h1>
          <p className="max-w-[400px] text-[15px] leading-[1.6] text-[#D5C4E2]">
            {t.home.subtitle}
          </p>
          <Link
            href="/search"
            className="mt-1 w-fit rounded-[7px] bg-accent px-7 py-3.5 text-sm font-bold text-white"
          >
            {t.home.startShopping}
          </Link>
        </div>

        {/* panel B — COD callout */}
        <div className="flex flex-col justify-between gap-3 rounded-lg bg-accent p-[26px]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-tint" />
              <span className="font-mono text-[10px] tracking-[0.16em] text-[#F8E4DA]">
                {t.home.paymentBadge}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
              {t.home.codTitle}
            </h2>
            <p className="text-[13px] leading-[1.55] text-[#F8E4DA]">
              {t.home.codDesc}
            </p>
          </div>
          <Link href="/faqs" className="text-[13px] font-bold text-white">
            {t.home.howCodWorks}
          </Link>
        </div>

        {/* panel C — vendor of the week */}
        <div className="flex flex-col justify-between gap-3 rounded-lg border-[1.5px] border-primary p-[26px]">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted-table">
              {t.home.vendorOfWeek}
            </p>
            {vendorOfWeek ? (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] bg-primary text-[13px] font-extrabold text-white">
                    {vendorOfWeek.store_name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-ink-dark">
                      {vendorOfWeek.store_name}
                    </p>
                    <p className="text-[11.5px] text-muted">
                      {typeof vendorOfWeekProductCount === "number"
                        ? `${vendorOfWeekProductCount} ${t.home.productsSuffix}`
                        : t.home.newToKmo}
                    </p>
                  </div>
                </div>
                <div className="h-[82px] rounded-md bg-surface-alt" />
              </>
            ) : (
              <p className="text-sm text-muted">{t.home.newVendorsWeekly}</p>
            )}
          </div>
          {vendorOfWeek ? (
            <Link href={`/store/${vendorOfWeek.slug}`} className="text-[13px] font-bold text-accent">
              {t.home.visitStore}
            </Link>
          ) : null}
        </div>
      </section>

      {/* browse categories */}
      {categories && categories.length > 0 ? (
        <section className="px-4 pt-8 sm:px-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
              {t.home.browseCategories}
            </h2>
            <Link href="/search" className="text-[13px] font-bold text-accent">
              {t.home.allCategories}
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/search?category=${c.id}`}
                className="w-[128px] shrink-0 overflow-hidden rounded-lg border border-border bg-surface sm:w-[158px]"
              >
                <div
                  className="h-[74px] bg-surface-alt bg-cover bg-center sm:h-[98px]"
                  style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
                />
                <div className="flex flex-col gap-0.5 p-3">
                  <span className="line-clamp-1 text-[12.5px] font-bold text-ink-dark">{c.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* limited-time promotions, admin-managed */}
      <PromotionsSection promotions={promotions} />

      {/* the three busiest categories, ranked by units sold */}
      {(topCategories ?? []).map((category) => (
        <TopCategorySection key={category.id} category={category} pricingPromotions={pricingPromotions} />
      ))}

      {/* featured vendors — 3 col */}
      <section id="featured-vendors" className="px-4 pt-8 sm:px-10">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
              {t.home.featuredVendors}
            </h2>
            <p className="text-[13.5px] text-muted">{t.home.featuredVendorsSub}</p>
          </div>
          <Link href="/vendors" className="shrink-0 text-[13px] font-bold text-accent">
            {t.home.seeAllVendors}
          </Link>
        </div>
        {!vendors || vendors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
            {t.home.noVendorsYet}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {vendors.slice(0, 6).map((v) => (
              <Link
                key={v.id}
                href={`/store/${v.slug}`}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <div
                  className="h-[76px] bg-surface-alt bg-cover bg-center"
                  style={v.cover_url ? { backgroundImage: `url(${v.cover_url})` } : undefined}
                />
                <div className="-mt-[34px] flex flex-col gap-2.5 p-4">
                  <span
                    className="flex h-[50px] w-[50px] items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white ring-[3px] ring-white bg-cover bg-center"
                    style={
                      v.logo_url
                        ? { backgroundImage: `url(${v.logo_url})` }
                        : undefined
                    }
                  >
                    {!v.logo_url && v.store_name.charAt(0)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[15.5px] font-bold tracking-[-0.015em] text-ink-dark">
                      {v.store_name}
                    </span>
                    <span className="rounded bg-danger-tint px-[5px] py-[3px] font-mono text-[9px] tracking-[0.05em] text-danger">
                      {t.home.verified}
                    </span>
                  </div>
                  {v.description ? (
                    <p className="line-clamp-2 text-[13px] leading-[1.55] text-muted">
                      {v.description}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between border-t border-[#F1EAE6] pt-[11px] text-[12.5px]">
                    <span className="text-muted">{v.area || t.header.city}</span>
                    <span className="font-bold text-primary">{t.home.visit}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* featured products — 4 col */}
      <FeaturedProducts products={products} pricingPromotions={pricingPromotions} />

      {/* ratings & reviews summary */}
      {ratingSummary && ratingSummary.count > 0 ? (
        <section className="px-4 pt-8 sm:px-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
              {t.home.ratingsReviews}
            </h2>
            <Link href="/search" className="text-[13px] font-bold text-accent">
              {t.home.seeAllReviews}
            </Link>
          </div>
          <div className="grid gap-[26px] lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-[10px] border border-border bg-surface p-6">
              <p className="text-[42px] font-extrabold tracking-[-0.04em] text-primary">
                {ratingSummary.average.toFixed(1)}
              </p>
              <p className="tracking-[0.1em] text-accent">{"★".repeat(Math.round(ratingSummary.average))}</p>
              <p className="mt-1 text-[12.5px] text-muted">
                {ratingSummary.count.toLocaleString()} {t.home.ratingsAcrossVendors}
              </p>
              <div className="mt-4 flex flex-col gap-1.5">
                {ratingSummary.bars.map((b) => (
                  <div key={b.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-muted">{b.stars}★</span>
                    <div className="h-1.5 flex-1 rounded-full bg-surface-alt">
                      <div
                        className="h-1.5 rounded-full bg-accent"
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted">{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {(recentReviews ?? []).map((r) => (
                <div key={r.id} className="rounded-[10px] border border-border bg-surface p-[18px_20px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {(r.profiles?.full_name ?? "K").charAt(0)}
                      </span>
                      <div>
                        <p className="text-[13px] font-bold text-ink-dark">
                          {r.profiles?.full_name ?? "Customer"}
                        </p>
                        <p className="text-[11px] text-muted-table">{r.products?.name}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-accent">{"★".repeat(r.rating)}</span>
                  </div>
                  {r.body ? (
                    <p className="mt-2.5 text-[12.5px] leading-[1.6] text-ink-dark">{r.body}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* testimonials */}
      <Testimonials />

      {/* contact form */}
      <ContactSection />
    </main>
  );
}

function PromotionsSection({
  promotions,
}: {
  promotions: Awaited<ReturnType<typeof listActivePromotions>> | undefined;
}) {
  const { t } = useLanguage();
  // A deal whose timer runs out while the page is open drops out immediately.
  const [expired, setExpired] = useState<Record<string, true>>({});
  const live = (promotions ?? []).filter((p) => !expired[p.id]);

  if (live.length === 0) return null;

  return (
    <section className="px-4 pt-8 sm:px-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
            {t.home.limitedTimeDeals}
          </h2>
          <p className="text-[13.5px] text-muted">{t.home.grabDeals}</p>
        </div>
        <Link href="/search" className="shrink-0 text-[13px] font-bold text-accent">
          {t.home.shopAll}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {live.map((promo) => {
          const href = promo.vendors
            ? `/store/${promo.vendors.slug}`
            : promo.category_id
              ? `/search?category=${promo.category_id}`
              : "/search";
          return (
            <Link
              key={promo.id}
              href={href}
              className="group relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-xl border border-border bg-primary p-5 sm:min-h-[230px]"
              style={
                promo.image_url
                  ? {
                      backgroundImage: `linear-gradient(to top, rgba(28,10,42,0.92) 0%, rgba(28,10,42,0.55) 55%, rgba(28,10,42,0.25) 100%), url(${promo.image_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold text-white">
                    {promo.discount_type === "percentage"
                      ? `${Number(promo.discount_value)}${t.home.percentOff}`
                      : `Rs. ${Number(promo.discount_value).toLocaleString()}`}
                  </span>
                  {promo.categories ? (
                    <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-white/90">
                      {promo.categories.name}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-[19px] font-extrabold leading-[1.2] tracking-[-0.02em] text-white sm:text-[21px]">
                  {promo.title}
                </h3>
                {promo.subtitle ? (
                  <p className="line-clamp-2 text-[13px] leading-[1.5] text-white/80">
                    {promo.subtitle}
                  </p>
                ) : null}
                {promo.vendors ? (
                  <p className="text-[11.5px] font-semibold text-accent-tint">
                    {promo.vendors.store_name}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/60">
                    {t.home.endsIn}
                  </span>
                  <Countdown
                    endsAt={promo.ends_at}
                    onExpire={() => setExpired((prev) => ({ ...prev, [promo.id]: true }))}
                  />
                </div>
                <span className="text-[12.5px] font-bold text-white group-hover:underline">
                  {t.home.shopNow}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function TopCategorySection({
  category,
  pricingPromotions,
}: {
  category: TopCategory;
  pricingPromotions: ReturnType<typeof toPricingPromotions>;
}) {
  const { t } = useLanguage();
  const { data: products } = useQuery({
    queryKey: ["top-category-products", category.id],
    queryFn: () => listPublishedProducts(supabase, { categoryId: category.id, limit: 4 }),
  });

  if (!products || products.length === 0) return null;

  return (
    <section className="px-4 pt-8 sm:px-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
            {t.home.topIn} {category.name}
          </h2>
          <p className="text-[13.5px] text-muted">
            {category.sold_count > 0
              ? `${category.sold_count.toLocaleString()} ${t.home.soldByShoppers}`
              : t.home.popularWithShoppers}
          </p>
        </div>
        <Link
          href={`/search?category=${category.id}`}
          className="shrink-0 text-[13px] font-bold text-accent"
        >
          {t.home.seeAll}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((p) => {
          const cp = cardPricing(
            { id: p.id, vendorId: p.vendor_id, categoryId: p.category_id, price: p.price, compareAtPrice: p.compare_at_price },
            pricingPromotions,
          );
          return (
            <ProductCard
              key={p.id}
              href={`/product/${p.slug}`}
              LinkComponent={Link}
              imageUrl={p.product_images[0]?.url}
              vendorName={p.vendors?.store_name}
              name={p.name}
              price={cp.price}
              compareAtPrice={cp.compareAtPrice}
              has360={p.has_360_view}
            />
          );
        })}
      </div>
    </section>
  );
}

function FeaturedProducts({
  products,
  pricingPromotions,
}: {
  products: Awaited<ReturnType<typeof listPublishedProducts>> | undefined;
  pricingPromotions: ReturnType<typeof toPricingPromotions>;
}) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<"popular" | "new" | "cod">("popular");

  const filterOptions = [
    { key: "popular", label: t.home.popular },
    { key: "new", label: t.home.newIn },
    { key: "cod", label: t.home.codOnly },
  ] as const;

  return (
    <section className="px-4 pt-8 sm:px-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
          {t.home.featuredProducts}
        </h2>
        <div className="flex gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className="rounded-full px-[15px] py-2 text-[12.5px] font-semibold"
              style={
                filter === opt.key
                  ? { background: "var(--color-accent)", color: "#fff" }
                  : { background: "#fff", border: "1px solid var(--color-border)", color: "var(--color-primary)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {!products || products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
          {t.home.noProductsYet}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {products.map((p) => {
            const cp = cardPricing(
              { id: p.id, vendorId: p.vendor_id, categoryId: p.category_id, price: p.price, compareAtPrice: p.compare_at_price },
              pricingPromotions,
            );
            return (
              <ProductCard
                key={p.id}
                href={`/product/${p.slug}`}
                LinkComponent={Link}
                imageUrl={p.product_images[0]?.url}
                vendorName={p.vendors?.store_name}
                name={p.name}
                price={cp.price}
                compareAtPrice={cp.compareAtPrice}
                has360={p.has_360_view}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

const TESTIMONIALS = [
  {
    quote:
      "I run a small stitching business from home in Gulshan — KMO gave me a real storefront without having to build a website or chase a developer. Orders come in on my phone and I pack them the same evening.",
    name: "Ayesha R.",
    area: "Gulshan-e-Iqbal, Karachi",
  },
  {
    quote:
      "Cash on delivery is the only reason my family started ordering online at all. No card details, no advance payment — you pay the rider once the box is in your hands.",
    name: "Bilal K.",
    area: "North Nazimabad, Karachi",
  },
  {
    quote:
      "As a vendor, knowing every seller on the platform is verified made it worth joining. Customers trust the badge, and that trust turns into repeat orders.",
    name: "Sana M.",
    area: "Tariq Road, Karachi",
  },
];

function Testimonials() {
  const { t } = useLanguage();
  return (
    <section className="mt-8 bg-accent-tint px-4 pb-9 pt-9 sm:px-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
          {t.home.whatKarachiSaying}
        </h2>
        <p className="text-[13.5px] text-muted">{t.home.realFeedback}</p>
      </div>
      <div className="grid gap-[18px] sm:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="flex flex-col gap-3.5 rounded-xl border border-[#F2DDD3] bg-surface p-6"
          >
            <span className="font-serif text-[28px] font-extrabold leading-none text-accent">
              &ldquo;
            </span>
            <p className="text-sm leading-[1.65] text-ink-dark">{t.quote}</p>
            <div className="flex items-center gap-2.5 border-t border-[#F2DDD3] pt-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {t.name.charAt(0)}
              </span>
              <div>
                <p className="text-[13.5px] font-bold text-ink-dark">{t.name}</p>
                <p className="text-[11.5px] text-danger">{t.area}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactSection() {
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitContactMessage(supabase, {
        firstName,
        lastName,
        phone,
        message: businessName ? `[Business: ${businessName}] ${message}` : message,
      }),
  });

  return (
    <section id="contact-us" className="px-4 py-11 sm:px-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-3.5 pt-2">
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-accent">{t.contact.getInTouch}</p>
          <h2 className="text-[26px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink">
            {t.contact.haveQuestion}
          </h2>
          <p className="max-w-[340px] text-sm leading-[1.65] text-muted">
            {t.contact.description}
          </p>
          <div className="mt-2 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <a
                href="mailto:support@karachimart.pk"
                className="text-[13.5px] text-ink-dark hover:text-primary hover:underline"
              >
                support@karachimart.pk
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <a
                href="tel:021111566566"
                className="text-[13.5px] text-ink-dark hover:text-primary hover:underline"
              >
                021 111 KMO KMO
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              <span className="text-[13.5px] text-ink-dark">{t.contact.hours}</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-7"
        >
          {mutation.isSuccess ? (
            <p className="text-[12.5px] font-bold text-success">{t.contact.thanksMessage}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label={t.contact.firstName}>
                  <input
                    required
                    placeholder={t.contact.firstName}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </Field>
                <Field label={t.contact.lastName}>
                  <input
                    required
                    placeholder={t.contact.lastName}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label={t.contact.phoneNumber}>
                  <input
                    required
                    type="tel"
                    placeholder={t.contact.phoneNumber}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </Field>
                <Field label={t.contact.businessName} optional optionalLabel={t.contact.optional}>
                  <input
                    placeholder={t.contact.yourShopName}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </Field>
              </div>
              <Field label={t.contact.message}>
                <textarea
                  required
                  rows={4}
                  placeholder={t.contact.messagePlaceholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-y rounded-lg border border-border px-[13px] py-[11px] font-sans text-[13.5px] outline-none focus:border-primary-light"
                />
              </Field>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-fit rounded-[9px] bg-accent px-[30px] py-[13px] text-sm font-bold text-white disabled:opacity-60"
              >
                {mutation.isPending ? t.contact.sending : t.contact.sendMessage}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  optional,
  optionalLabel,
  children,
}: {
  label: string;
  optional?: boolean;
  optionalLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <span className="text-[12.5px] font-bold text-ink-dark">
        {label}
        {optional ? <span className="font-medium text-muted-table"> {optionalLabel}</span> : null}
      </span>
      {children}
    </div>
  );
}
