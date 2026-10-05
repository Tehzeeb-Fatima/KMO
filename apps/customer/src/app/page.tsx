"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  listActivePromotions,
  listCategories,
  listPublishedProducts,
  listTopCategories,
  getPlatformSettings,
  listActiveBanners,
  listActiveTestimonials,
  type BannerRow,
  listVendors,
  listRecentReviews,
  getSiteRatingSummary,
  submitContactMessage,
  promotionProductFilter,
  toPricingPromotions,
  type TopCategory,
} from "@kmo/shared/api";
import { CATEGORY_ICONS, cardPricing, type CategoryIconKey } from "@kmo/shared/lib";
import { Countdown, ProductCard } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";
import { HorizontalSlider } from "@/components/horizontal-slider";
import { AddToCartButton, WishlistHeart } from "@/components/product-card-actions";
import { useLanguage } from "@/lib/i18n/language-context";

const VENDOR_URL = process.env.NEXT_PUBLIC_VENDOR_URL ?? "https://vendor.karachimartonline.com";

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
  const { data: banners } = useQuery({
    queryKey: ["active-banners"],
    queryFn: () => listActiveBanners(supabase),
  });
  const { data: allActivePromotions } = useQuery({
    queryKey: ["active-promotions-pricing"],
    queryFn: () => listActivePromotions(supabase, 100),
  });
  const pricingPromotions = toPricingPromotions(allActivePromotions ?? []);

  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getPlatformSettings(supabase),
  });

  const sectionCategories: TopCategory[] = (categories ?? [])
    .filter((c) => c.show_on_homepage)
    .sort((a, b) => a.homepage_order - b.homepage_order)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image_url: c.image_url,
      sold_count: 0,
      product_count: 0,
    }));

  return (
    <main className="flex flex-1 flex-col bg-white">
      <VerifyEmailBanner />
      <HomeBanner banners={banners} />

      {platformSettings?.show_hero_boxes !== false ? (
      <section className="grid gap-4 px-4 pt-7 sm:px-10 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div
          className="relative flex min-h-[260px] flex-col justify-center gap-4 overflow-hidden rounded-xl p-8 text-white transition-all duration-300 [transform-style:preserve-3d] hover:[transform:perspective(900px)_rotateX(4deg)_rotateY(-4deg)_translateY(-6px)] hover:shadow-[0_24px_40px_-18px_rgba(74,34,102,0.6)] sm:min-h-[300px] sm:p-[38px_34px]"
          style={{ background: "linear-gradient(135deg,#4a2266 0%,#8a3a7a 55%,#c4552f 100%)" }}
        >
          <span className="pointer-events-none absolute -right-[70px] -top-[70px] h-[260px] w-[260px] rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-[60px] right-[60px] h-[160px] w-[160px] rounded-full bg-white/10" />
          <p className="relative font-mono text-[10.5px] tracking-[0.18em] text-[#F3D2C2]">
            {t.home.heroLiveBadge}
          </p>
          <h1 className="relative text-[32px] font-extrabold leading-[1.05] tracking-[-0.038em] text-white sm:text-[44px]">
            {t.home.heroLiveTitle}
          </h1>
          <p className="relative max-w-[420px] text-[15px] leading-[1.6] text-white/85">
            {t.home.heroLiveDesc}
          </p>
          <Link
            href="/search"
            className="relative mt-1 w-fit rounded-full bg-white px-7 py-3.5 text-sm font-bold text-primary"
          >
            {t.home.heroLiveCta}
          </Link>
        </div>

        <div className="flex min-h-[260px] flex-col justify-between gap-4 rounded-xl border border-[#e4d9ee] bg-white p-[26px] transition-all duration-300 [transform-style:preserve-3d] hover:[transform:perspective(900px)_rotateX(4deg)_rotateY(-4deg)_translateY(-6px)] hover:shadow-[0_24px_40px_-18px_rgba(74,34,102,0.5)] sm:min-h-[300px]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="font-mono text-[10px] tracking-[0.16em] text-accent">
                {t.home.heroWelcomeBadge}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold leading-[1.15] tracking-[-0.03em] text-ink-dark">
              {t.home.heroWelcomeTitle}
            </h2>
            <p className="text-[13px] leading-[1.55] text-muted">
              {t.home.heroWelcomeDesc}
            </p>
          </div>
          <Link
            href="/search"
            className="w-fit rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-white"
          >
            {t.home.heroWelcomeCta}
          </Link>
        </div>
        {/* panel C — sell on KMO */}
        <div className="flex min-h-[260px] flex-col justify-between gap-4 rounded-xl border-[1.5px] border-primary p-[26px] transition-all duration-300 [transform-style:preserve-3d] hover:[transform:perspective(900px)_rotateX(4deg)_rotateY(-4deg)_translateY(-6px)] hover:shadow-[0_24px_40px_-18px_rgba(74,34,102,0.6)] sm:min-h-[300px]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-mono text-[10px] tracking-[0.16em] text-primary">
                {t.home.heroSellBadge}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold leading-[1.15] tracking-[-0.03em] text-ink-dark">
              {t.home.heroSellTitle}
            </h2>
            <p className="text-[13px] leading-[1.55] text-muted">
              {t.home.heroSellDesc}
            </p>
          </div>
          <a
            href={`${VENDOR_URL}/signup`}
            className="w-fit rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-white"
          >
            {t.home.heroSellCta}
          </a>
        </div>
</section>
      ) : null}

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
          <HorizontalSlider itemClassName="w-[112px]">
            {categories.map((c) => (
              <Link key={c.id} href={`/search?category=${c.id}`} className="group flex flex-col items-center gap-2 text-center">
                <div
                  className={`flex aspect-square w-full items-center justify-center rounded-[22px] border border-border-primary bg-white bg-cover bg-center shadow-[0_10px_22px_-12px_rgba(74,34,102,0.45)] transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:perspective(700px)_rotateX(10deg)_rotateY(-8deg)_translateY(-8px)] group-hover:shadow-[0_26px_34px_-16px_rgba(74,34,102,0.55)]`}
                  style={c.image_url ? { backgroundImage: `url(${c.image_url})` } : undefined}
                >
                  {!c.image_url ? (
                    <span className="flex aspect-square w-[58%] items-center justify-center rounded-full bg-gradient-to-br from-[#6b2fa0] to-[#4a2266] text-white shadow-[0_6px_14px_-6px_rgba(74,34,102,0.6)] transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[46%] w-[46%]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        dangerouslySetInnerHTML={{
                          __html: CATEGORY_ICONS[(c.icon as CategoryIconKey) in CATEGORY_ICONS ? (c.icon as CategoryIconKey) : "tag"].paths,
                        }}
                      />
                    </span>
                  ) : null}
                </div>
                <span className="line-clamp-2 text-[12.5px] font-bold text-ink-dark">{c.name}</span>
              </Link>
            ))}
          </HorizontalSlider>
        </section>
      ) : null}

      {/* limited-time promotions, admin-managed */}
      <PromotionsSection promotions={promotions} pricingPromotions={pricingPromotions} />

      {/* the three busiest categories, ranked by units sold */}
      {sectionCategories.map((category) => (
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
                className="overflow-hidden rounded-lg border border-border bg-surface transition-shadow duration-300 hover:shadow-[0_14px_28px_-12px_rgba(74,34,102,0.45)]"
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
      <Testimonials enabled={platformSettings?.show_testimonials === true} />

      {(() => {
        const bottom = categories?.find((c) => c.id === platformSettings?.bottom_category_id);
        if (!bottom) return null;
        return (
          <TopCategorySection
            category={{
              id: bottom.id,
              name: bottom.name,
              slug: bottom.slug,
              image_url: bottom.image_url,
              sold_count: 0,
              product_count: 0,
            }}
            pricingPromotions={pricingPromotions}
          />
        );
      })()}

      {/* contact form */}
      <ContactSection />
    </main>
  );
}

function HomeBanner({ banners }: { banners: BannerRow[] | undefined }) {
  const slides = banners ?? [];
  const count = slides.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  const current = slides[index % count];
  const slideImage = (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${current.image_url})` }}
    >
      {current.title ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 sm:p-8">
          <p className="text-[18px] font-extrabold text-white sm:text-[26px]">{current.title}</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="px-4 pt-7 sm:px-10">
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-primary transition-shadow duration-200 hover:shadow-[0_10px_26px_-10px_rgba(74,34,102,0.5)] sm:aspect-[8/3]">
        {current.link_url ? (
          current.link_url.startsWith("/") ? (
            <Link href={current.link_url} className="block h-full w-full">
              {slideImage}
            </Link>
          ) : (
            <a href={current.link_url} className="block h-full w-full">
              {slideImage}
            </a>
          )
        ) : (
          slideImage
        )}

        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-primary"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={() => setIndex((i) => (i + 1) % count)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-primary"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Banner ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === index % count ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function PromotionsSection({
  promotions,
  pricingPromotions,
}: {
  promotions: Awaited<ReturnType<typeof listActivePromotions>> | undefined;
  pricingPromotions: ReturnType<typeof toPricingPromotions>;
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

      <div className="flex flex-col gap-5">
        {live.map((promo) => (
          <PromotionBlock
            key={promo.id}
            promo={promo}
            pricingPromotions={pricingPromotions}
            onExpire={() => setExpired((prev) => ({ ...prev, [promo.id]: true }))}
          />
        ))}
      </div>
    </section>
  );
}

function PromotionBlock({
  promo,
  pricingPromotions,
  onExpire,
}: {
  promo: Awaited<ReturnType<typeof listActivePromotions>>[number];
  pricingPromotions: ReturnType<typeof toPricingPromotions>;
  onExpire: () => void;
}) {
  const { t } = useLanguage();
  const sliderRef = useRef<HTMLDivElement>(null);
  const { data: products } = useQuery({
    queryKey: ["promotion-block-products", promo.id],
    queryFn: () => listPublishedProducts(supabase, { ...promotionProductFilter(promo), limit: 24 }),
  });
  const useSlider = (products?.length ?? 0) > 6;

  function scrollBy(direction: 1 | -1) {
    sliderRef.current?.scrollBy({
      left: direction * (sliderRef.current.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-border-primary bg-surface-lavender"
      style={
        promo.image_url
          ? {
              backgroundImage: `linear-gradient(to right, rgba(74,34,102,0.95) 0%, rgba(74,34,102,0.8) 60%, rgba(74,34,102,0.55) 100%), url(${promo.image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4 bg-primary px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold text-white">
              {promo.badge_text ||
                (promo.discount_type === "percentage"
                  ? `${Number(promo.discount_value)}${t.home.percentOff}`
                  : `Rs. ${Number(promo.discount_value).toLocaleString()}`)}
            </span>
          </div>
          <h3 className="text-[19px] font-extrabold leading-[1.2] tracking-[-0.02em] text-white sm:text-[21px]">
            {promo.title}
          </h3>
          {promo.subtitle ? (
            <p className="line-clamp-1 text-[13px] text-white/80">{promo.subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/60">
              {t.home.endsIn}
            </span>
            <Countdown endsAt={promo.ends_at} onExpire={onExpire} />
          </div>
          <Link
            href={`/search?promo=${promo.id}`}
            className="shrink-0 rounded-[7px] bg-white px-4 py-2 text-[12.5px] font-bold text-primary"
          >
            {t.home.shopNow}
          </Link>
        </div>
      </div>

      {products && products.length > 0 ? (
        useSlider ? (
          <div className="relative px-3 py-4 sm:px-5">
            <div
              ref={sliderRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth sm:gap-4"
            >
              {products.map((p) => (
                <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-5rem)/6)]">
                  <PromoProductCard product={p} pricingPromotions={pricingPromotions} />
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => scrollBy(-1)}
              className="absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-lg font-bold text-primary shadow-sm"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => scrollBy(1)}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-lg font-bold text-primary shadow-sm"
            >
              ›
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-3 py-4 sm:grid-cols-3 sm:px-5 lg:grid-cols-6">
            {products.map((p) => (
              <PromoProductCard key={p.id} product={p} pricingPromotions={pricingPromotions} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function PromoProductCard({
  product: p,
  pricingPromotions,
}: {
  product: Awaited<ReturnType<typeof listPublishedProducts>>[number];
  pricingPromotions: ReturnType<typeof toPricingPromotions>;
}) {
  const cp = cardPricing(
    { id: p.id, vendorId: p.vendor_id, categoryId: p.category_id, price: p.price, compareAtPrice: p.compare_at_price },
    pricingPromotions,
  );
  return (
    <ProductCard
      href={`/product/${p.slug}`}
      LinkComponent={Link}
      imageUrl={p.product_images[0]?.url}
      vendorName={p.vendors?.store_name}
      name={p.name}
      price={cp.price}
      compareAtPrice={cp.compareAtPrice}
      promoLabel={cp.badgeText}
      has360={p.has_360_view}
      topRight={<WishlistHeart productId={p.id} />}
      footer={<AddToCartButton productId={p.id} {...defaultCartVariant(p)} />}
    />
  );
}

/** The variant a card adds to the cart: the first one in stock, or the base product. */
function defaultCartVariant(p: {
  stock_quantity: number;
  product_variants: { id: string; stock_quantity: number }[];
}): { variantId: string | null; outOfStock: boolean } {
  if (p.product_variants.length > 0) {
    const inStock = p.product_variants.find((v) => v.stock_quantity > 0);
    return { variantId: inStock?.id ?? null, outOfStock: !inStock };
  }
  return { variantId: null, outOfStock: p.stock_quantity <= 0 };
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
    queryFn: () => listPublishedProducts(supabase, { categoryId: category.id, limit: 12 }),
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
      <HorizontalSlider>
        {products.map((p) => (
          <PromoProductCard key={p.id} product={p} pricingPromotions={pricingPromotions} />
        ))}
      </HorizontalSlider>
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
                promoLabel={cp.badgeText}
                has360={p.has_360_view}
                topRight={<WishlistHeart productId={p.id} />}
                footer={<AddToCartButton productId={p.id} {...defaultCartVariant(p)} />}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function Testimonials({ enabled }: { enabled: boolean }) {
  const { t } = useLanguage();
  const { data: testimonials } = useQuery({
    queryKey: ["active-testimonials"],
    queryFn: () => listActiveTestimonials(supabase),
    enabled,
  });

  // Hidden until an admin switches the section on and adds at least one.
  if (!enabled || !testimonials || testimonials.length === 0) return null;

  return (
    <section className="mt-8 bg-accent-tint px-4 pb-9 pt-9 sm:px-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
          {t.home.whatKarachiSaying}
        </h2>
        <p className="text-[13.5px] text-muted">{t.home.realFeedback}</p>
      </div>
      <div className="grid gap-[18px] sm:grid-cols-3">
        {testimonials.map((t) => (
          <div
            key={t.id}
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
                {t.area ? <p className="text-[11.5px] text-danger">{t.area}</p> : null}
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

/** Shown on the homepage right after signup, until the customer verifies their email. */
function VerifyEmailBanner() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      setEmail(sessionStorage.getItem("kmo_verify_email"));
    } catch {
      setEmail(null);
    }
  }, []);

  if (!email) return null;

  return (
    <div className="flex items-start justify-between gap-4 bg-primary-tint px-4 py-3 text-sm text-ink-dark sm:px-10">
      <p>
        Account created. We sent a verification link to <span className="font-semibold">{email}</span>. Please open it to
        activate your account and sign in.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem("kmo_verify_email");
          } catch {
            // ignore
          }
          setEmail(null);
        }}
        className="shrink-0 font-bold text-primary"
      >
        Dismiss
      </button>
    </div>
  );
}
