"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listCategories, listPublishedProducts } from "@kmo/shared/api";
import { ProductCard } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";

type Sort = "newest" | "price_asc" | "price_desc";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

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

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
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

  const { data: products, isLoading } = useQuery({
    queryKey: ["search", q, category, minPrice, maxPrice, sort],
    queryFn: () =>
      listPublishedProducts(supabase, {
        search: q || undefined,
        categoryId: category || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort,
      }),
  });

  const filterPanel = (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-[13px] font-bold text-ink">Category</p>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => updateParams({ category: null })}
            className="rounded-md px-2.5 py-1.5 text-left text-[13px]"
            style={
              !category
                ? { background: "var(--color-primary-tint)", color: "var(--color-primary)", fontWeight: 700 }
                : { color: "var(--color-ink-secondary)" }
            }
          >
            All categories
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => updateParams({ category: c.id })}
              className="rounded-md px-2.5 py-1.5 text-left text-[13px]"
              style={
                category === c.id
                  ? { background: "var(--color-primary-tint)", color: "var(--color-primary)", fontWeight: 700 }
                  : { color: "var(--color-ink-secondary)" }
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[13px] font-bold text-ink">Price range</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={minPrice}
            onBlur={(e) => updateParams({ min: e.target.value || null })}
            className="w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-primary-light"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            placeholder="Max"
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
          placeholder="Search products, brands and vendors"
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-table"
        />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="rounded-full border border-border bg-white px-4 py-2 text-[13px] font-bold text-primary lg:hidden"
        >
          Filters
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{filterPanel}</aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              {isLoading ? "Searching…" : `${products?.length ?? 0} results`}
              {q ? ` for "${q}"` : ""}
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
              : products?.map((p) => (
                  <ProductCard
                    key={p.id}
                    href={`/product/${p.slug}`}
                    LinkComponent={Link}
                    imageUrl={p.product_images[0]?.url}
                    vendorName={p.vendors?.store_name}
                    name={p.name}
                    price={p.price}
                    compareAtPrice={p.compare_at_price}
                  />
                ))}
            {!isLoading && products?.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
                No products match your search.
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
              <p className="text-base font-bold text-ink">Filters</p>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="text-sm font-bold text-primary"
              >
                Done
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      ) : null}
    </div>
  );
}
