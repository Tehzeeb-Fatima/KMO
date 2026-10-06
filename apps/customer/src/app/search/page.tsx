"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  listActivePromotions,
  listCategories,
  listPublishedProducts,
  promotionProductFilter,
  toPricingPromotions,
} from "@kmo/shared/api";
import { cardPricing, mainCategories } from "@kmo/shared/lib";
import { ProductCard } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import type { TranslationTree } from "@/lib/i18n/translations";

type Sort = "newest" | "price_asc" | "price_desc";

function sortOptions(t: TranslationTree): { value: Sort; label: string }[] {
  return [
    { value: "newest", label: t.search.sortNewest },
    { value: "price_asc", label: t.search.sortPriceAsc },
    { value: "price_desc", label: t.search.sortPriceDesc },
  ];
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="p-10 text-sm text-muted">Loading…</p>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const SORT_OPTIONS = sortOptions(t);

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const promo = searchParams.get("promo") ?? "";
  const minPrice = searchParams.get("min") ?? "";
  const maxPrice = searchParams.get("max") ?? "";
  const sort = (searchParams.get("sort") as Sort) ?? "newest";

  const [searchInput, setSearchInput] = useState(q);
  const [filtersOpen, setFiltersOpen] = useState(false);

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/search?${params.toString()}`);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== q) updateParams({ q: searchInput || null });
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });

  // The main category being browsed (directly or via one of its
  // sub-categories) and its sub-categories, for the sub-category chips.
  const selectedCategory = categories?.find((c) => c.id === category);
  const activeMainId = selectedCategory ? (selectedCategory.parent_id ?? selectedCategory.id) : "";
  const activeMain = categories?.find((c) => c.id === activeMainId);
  const activeSubs = (categories ?? [])
    .filter((c) => activeMainId && c.parent_id === activeMainId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const { data: activePromotions } = useQuery({
    queryKey: ["active-promotions-search"],
    queryFn: () => listActivePromotions(supabase, 100),
  });
  const pricingPromotions = toPricingPromotions(activePromotions ?? []);
  const activePromo = promo ? activePromotions?.find((p) => p.id === promo) : undefined;
  const promoFilter = activePromo ? promotionProductFilter(activePromo) : {};

  const { data: products, isLoading } = useQuery({
    queryKey: ["search", q, category, promo, minPrice, maxPrice, sort],
    queryFn: () =>
      listPublishedProducts(supabase, {
        search: q || undefined,
        ...(activePromo ? promoFilter : { categoryId: category || undefined }),
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort,
      }),
    enabled: !promo || !!activePromotions,
  });

  const filterPanel = (
    <div className="flex flex-col gap-6">
      {activePromotions && activePromotions.length > 0 ? (
        <div>
          <p className="mb-3 text-[13px] font-bold text-ink">{t.home.limitedTimeDeals}</p>
          <div className="flex flex-col gap-1">
            {activePromotions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => updateParams({ promo: p.id, category: null })}
                className="rounded-md px-2.5 py-1.5 text-left text-[13px]"
                style={
                  promo === p.id
                    ? { background: "var(--color-accent-tint)", color: "var(--color-accent)", fontWeight: 700 }
                    : { color: "var(--color-ink-secondary)" }
                }
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-[13px] font-bold text-ink">{t.search.category}</p>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => updateParams({ category: null, promo: null })}
            className="rounded-md px-2.5 py-1.5 text-left text-[13px]"
            style={
              !category && !promo
                ? { background: "var(--color-primary-tint)", color: "var(--color-primary)", fontWeight: 700 }
                : { color: "var(--color-ink-secondary)" }
            }
          >
            {t.search.allCategories}
          </button>
          {mainCategories(categories ?? []).map((c) => (
            <div key={c.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => updateParams({ category: c.id, promo: null })}
                className="rounded-md px-2.5 py-1.5 text-left text-[13px]"
                style={
                  category === c.id
                    ? { background: "var(--color-primary-tint)", color: "var(--color-primary)", fontWeight: 700 }
                    : activeMainId === c.id
                      ? { color: "var(--color-primary)", fontWeight: 700 }
                      : { color: "var(--color-ink-secondary)" }
                }
              >
                {c.name}
              </button>
              {activeMainId === c.id
                ? activeSubs.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => updateParams({ category: sub.id, promo: null })}
                      className="ml-3 rounded-md px-2.5 py-1 text-left text-[12.5px]"
                      style={
                        category === sub.id
                          ? { background: "var(--color-primary-tint)", color: "var(--color-primary)", fontWeight: 700 }
                          : { color: "var(--color-ink-secondary)" }
                      }
                    >
                      {sub.name}
                    </button>
                  ))
                : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[13px] font-bold text-ink">{t.search.priceRange}</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={t.search.min}
            defaultValue={minPrice}
            onBlur={(e) => updateParams({ min: e.target.value || null })}
            className="w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            placeholder={t.search.max}
            defaultValue={maxPrice}
            onBlur={(e) => updateParams({ max: e.target.value || null })}
            className="w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-5 flex items-center rounded-full border border-border bg-surface-alt py-1.5 pl-[18px] pr-1.5">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t.search.searchPlaceholder}
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-table"
        />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="rounded-full border border-border bg-white px-4 py-2 text-[13px] font-bold text-primary lg:hidden"
        >
          {t.search.filters}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{filterPanel}</aside>

        <div>
          {activePromo ? (
            <div className="mb-4">
              <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
                {activePromo.title}
              </h2>
              {activePromo.subtitle ? (
                <p className="text-[13.5px] text-muted">{activePromo.subtitle}</p>
              ) : null}
            </div>
          ) : null}
          {!activePromo && activeMain ? (
            <div className="mb-4">
              <h2 className="mb-2.5 text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
                {activeMain.name}
              </h2>
              {activeSubs.length > 0 ? (
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                  {[{ id: activeMain.id, name: t.search.allInCategory }, ...activeSubs].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => updateParams({ category: c.id, promo: null })}
                      className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
                      style={
                        category === c.id
                          ? { background: "var(--color-accent)", color: "#fff" }
                          : { background: "#fff", border: "1px solid var(--color-border)", color: "var(--color-ink-secondary)" }
                      }
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              {isLoading ? t.search.searching : `${products?.length ?? 0} ${t.search.results}`}
              {q ? ` ${t.search.resultsFor} "${q}"` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateParams({ sort: opt.value === "newest" ? null : opt.value })}
                  className="rounded-full px-3.5 py-1.5 text-[12.5px] font-bold"
                  style={
                    sort === opt.value
                      ? { background: "var(--color-primary)", color: "#fff" }
                      : { background: "#fff", border: "1px solid var(--color-border)", color: "var(--color-ink)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-lg bg-surface-alt" />
                ))
              : products?.map((p) => {
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
                    />
                  );
                })}
            {!isLoading && products?.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
                {t.search.noResults}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="flex w-[85%] max-w-[320px] flex-col gap-6 overflow-y-auto bg-surface p-6">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-ink">{t.search.filters}</p>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="text-sm font-bold text-primary"
              >
                {t.search.done}
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      ) : null}
    </div>
  );
}
