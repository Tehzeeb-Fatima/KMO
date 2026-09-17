"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProductById,
  addToCart,
  listProductReviews,
  createReview,
  isWishlisted,
  addToWishlist,
  removeFromWishlist,
  listProductQuestions,
  askProductQuestion,
  listPublishedProducts,
} from "@kmo/shared/api";
import { Button, ProductCard } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";

export default function ProductDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", params.id],
    queryFn: () => getProductById(supabase, params.id),
  });

  const variantGroups = useMemo(() => {
    if (!product) return {};
    return product.product_variants.reduce<Record<string, typeof product.product_variants>>(
      (acc, v) => {
        (acc[v.option_name] ??= []).push(v);
        return acc;
      },
      {},
    );
  }, [product]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const selectedVariant = useMemo(() => {
    if (!product || product.product_variants.length === 0) return null;
    return (
      product.product_variants.find((v) =>
        Object.entries(selectedOptions).every(
          ([name, value]) => !(name === v.option_name) || v.option_value === value,
        ),
      ) ?? null
    );
  }, [product, selectedOptions]);

  const addMutation = useMutation({
    mutationFn: () => {
      if (!user || !product) throw new Error("Not ready");
      return addToCart(supabase, user.id, product.id, selectedVariant?.id ?? null, qty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  function requireAuthThen(action: () => void) {
    if (!user) {
      router.push("/login");
      return;
    }
    action();
  }

  const { data: wishlisted } = useQuery({
    queryKey: ["wishlisted", product?.id, user?.id],
    queryFn: () => isWishlisted(supabase, user!.id, product!.id),
    enabled: !!user && !!product,
  });

  const wishlistMutation = useMutation({
    mutationFn: () => {
      if (!user || !product) throw new Error("Not ready");
      return wishlisted
        ? removeFromWishlist(supabase, user.id, product.id)
        : addToWishlist(supabase, user.id, product.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlisted", product?.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?.id],
    queryFn: () => listProductReviews(supabase, product!.id),
    enabled: !!product,
  });

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!user || !product) throw new Error("Not ready");
      return createReview(supabase, {
        product_id: product.id,
        customer_id: user.id,
        rating: reviewRating,
        body: reviewBody,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", product?.id] });
      setReviewBody("");
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["questions", product?.id],
    queryFn: () => listProductQuestions(supabase, product!.id),
    enabled: !!product,
  });

  const [questionDraft, setQuestionDraft] = useState("");
  const questionMutation = useMutation({
    mutationFn: () => {
      if (!user || !product) throw new Error("Not ready");
      return askProductQuestion(supabase, product.id, user.id, questionDraft);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", product?.id] });
      setQuestionDraft("");
    },
  });

  const { data: moreFromVendor } = useQuery({
    queryKey: ["more-from-vendor", product?.vendors?.id],
    queryFn: () =>
      listPublishedProducts(supabase, { vendorId: product!.vendors!.id, limit: 5 }),
    enabled: !!product?.vendors,
  });

  const { data: suggested } = useQuery({
    queryKey: ["suggested-products", product?.category_id],
    queryFn: () =>
      listPublishedProducts(supabase, {
        categoryId: product!.category_id ?? undefined,
        limit: 5,
      }),
    enabled: !!product,
  });

  if (isLoading) {
    return <p className="p-10 text-sm text-muted">Loading product…</p>;
  }

  if (!product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <h1 className="text-xl font-bold text-ink">Product not found</h1>
        <p className="mt-2 text-sm text-muted">
          This product doesn&rsquo;t exist, or isn&rsquo;t published.
        </p>
      </div>
    );
  }

  const images = product.product_images.slice().sort((a, b) => a.sort_order - b.sort_order);
  const stock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const price = selectedVariant?.price_override ?? product.price;
  const discountPct =
    product.compare_at_price && product.compare_at_price > price
      ? Math.round(((product.compare_at_price - price) / product.compare_at_price) * 100)
      : null;

  const reviewCount = reviews?.length ?? 0;
  const reviewAverage =
    reviewCount > 0 ? (reviews ?? []).reduce((s, r) => s + r.rating, 0) / reviewCount : 0;
  const reviewBars = [5, 4, 3, 2, 1].map((stars) => {
    const n = (reviews ?? []).filter((r) => r.rating === stars).length;
    return { stars, pct: reviewCount > 0 ? Math.round((n / reviewCount) * 100) : 0 };
  });

  return (
    <div className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description ?? undefined,
            brand: product.brand ?? undefined,
            image: images.map((img) => img.url),
            offers: {
              "@type": "Offer",
              price,
              priceCurrency: "PKR",
              availability:
                stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              url: `https://karachimart.online/product/${product.id}`,
            },
          }),
        }}
      />
      <nav className="mb-4 hidden text-[12.5px] text-muted sm:block">
        Home /{" "}
        {product.vendors ? (
          <Link href={`/store/${product.vendors.slug}`} className="hover:text-primary">
            {product.vendors.store_name}
          </Link>
        ) : null}{" "}
        / <span className="font-semibold text-ink-dark">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[500px_minmax(0,1fr)_316px] lg:items-start lg:gap-[26px]">
        {/* gallery */}
        <div>
          <div
            className="h-[260px] rounded-[10px] border border-border bg-surface sm:h-[470px]"
            style={{
              background: images[activeImage]
                ? `url(${images[activeImage].url}) center/cover`
                : "repeating-linear-gradient(135deg,#F3ECE8 0 10px,#E9DFD9 10px 20px)",
            }}
          />
          {images.length > 1 ? (
            <div className="mt-2.5 flex gap-2 overflow-x-auto sm:gap-[10px]">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className="h-14 flex-1 shrink-0 rounded-lg sm:h-20"
                  style={{
                    background: `url(${img.url}) center/cover`,
                    border: i === activeImage ? "2px solid var(--color-accent)" : "2px solid transparent",
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* info */}
        <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-surface p-6">
          {product.vendors ? (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-table">
              {product.vendors.store_name}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold leading-tight tracking-[-0.03em] text-ink sm:text-[27px]">
            {product.name}
          </h1>
          {product.brand ? (
            <p className="text-sm text-muted">
              Brand: <span className="font-semibold text-ink-dark">{product.brand}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap items-baseline gap-2 border-t border-[#F1EAE6] pt-4">
            <span className="text-[28px] font-extrabold tracking-[-0.035em] text-primary sm:text-[34px]">
              Rs. {price.toLocaleString()}
            </span>
            {product.compare_at_price && product.compare_at_price > price ? (
              <span className="text-sm text-[#A79A94] line-through">
                Rs. {product.compare_at_price.toLocaleString()}
              </span>
            ) : null}
            {discountPct ? (
              <span className="rounded-full bg-accent px-2.5 py-1 text-[13px] font-bold text-white">
                -{discountPct}%
              </span>
            ) : null}
            <span className="rounded-full bg-primary-tint px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-primary">
              COD AVAILABLE
            </span>
          </div>

          <p className="text-sm font-semibold" style={{ color: stock > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {stock > 0 ? `In stock (${stock} available)` : "Out of stock"}
          </p>

          {Object.entries(variantGroups).map(([optionName, variants]) => (
            <div key={optionName} className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">
                {optionName}:{" "}
                <strong className="font-bold text-ink-dark">
                  {selectedOptions[optionName] ?? "Select"}
                </strong>
              </span>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const selected = selectedOptions[optionName] === v.option_value;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() =>
                        setSelectedOptions((prev) => ({ ...prev, [optionName]: v.option_value }))
                      }
                      className="min-w-[52px] rounded-full px-3.5 py-2.5 text-[13px] font-bold"
                      style={
                        selected
                          ? { background: "var(--color-accent)", color: "#fff" }
                          : { background: "#fff", border: "1.5px solid var(--color-border)", color: "var(--color-ink-secondary)" }
                      }
                    >
                      {v.option_value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <div className="flex items-center overflow-hidden rounded-full border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3.5 py-2 text-primary"
              >
                −
              </button>
              <span className="min-w-[34px] text-center text-sm font-bold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(stock || 10, q + 1))}
                className="px-3.5 py-2 text-primary"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="min-w-0 flex-1 basis-[calc(50%-38px)] sm:basis-auto"
              disabled={stock <= 0 || addMutation.isPending}
              onClick={() => requireAuthThen(() => addMutation.mutate())}
            >
              {addMutation.isPending ? "Adding…" : "Add to cart"}
            </Button>
            <Button
              variant="primary"
              className="min-w-0 flex-1 basis-[calc(50%-38px)] sm:basis-auto"
              disabled={stock <= 0}
              onClick={() =>
                requireAuthThen(() =>
                  addMutation.mutate(undefined, {
                    onSuccess: () => router.push("/cart"),
                  }),
                )
              }
            >
              Buy now
            </Button>
            <button
              type="button"
              onClick={() => requireAuthThen(() => wishlistMutation.mutate())}
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-base"
              style={{ color: "var(--color-accent)" }}
              aria-label="Toggle wishlist"
            >
              {wishlisted ? "♥" : "♡"}
            </button>
          </div>

          {product.description ? (
            <div className="border-t border-[#F1EAE6] pt-4">
              <h2 className="mb-2 text-[15px] font-bold text-ink">Description</h2>
              <p className="text-sm leading-[1.75] text-ink-dark">{product.description}</p>
            </div>
          ) : null}

          {product.tags && product.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-alt px-3 py-1 text-xs font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* sidebar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[10px] border border-border bg-surface p-5">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-table">
              Delivery &amp; payment
            </p>
            <div className="flex flex-col gap-3">
              {[
                {
                  label: "Karachi · 1–2 days",
                  sub: "Free over Rs. 2,500, otherwise Rs. 120 flat.",
                },
                { label: "Cash on delivery", sub: "Pay the rider, not in advance." },
                { label: "7-day returns", sub: "Managed by Karachi Mart, not the vendor." },
                { label: "Size exchange", sub: "Available for eligible clothing items." },
              ].map((row) => (
                <div key={row.label} className="flex gap-2.5">
                  <span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
                  <div>
                    <p className="text-[13px] font-bold text-ink-dark">{row.label}</p>
                    <p className="text-[11.5px] leading-[1.4] text-muted">{row.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {product.vendors ? (
            <div className="rounded-[10px] border border-border bg-surface p-5">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-table">
                Sold by
              </p>
              <div className="flex items-center gap-3">
                <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white">
                  {product.vendors.store_name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-dark">
                    {product.vendors.store_name}
                  </p>
                  {reviewCount > 0 ? (
                    <p className="text-xs text-muted">
                      <span className="font-bold text-accent">★ {reviewAverage.toFixed(1)}</span>
                      {" · "}
                      {reviewCount} ratings
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/store/${product.vendors.slug}`}
                  className="flex-1 rounded-lg border border-border px-4 py-[11px] text-center text-sm font-bold text-primary"
                >
                  Visit store
                </Link>
                <a
                  href="#ask-a-question"
                  className="flex-1 rounded-lg border border-border px-4 py-[11px] text-center text-sm font-bold text-primary"
                >
                  Ask a question
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* reviews */}
      <div className="mt-8 rounded-[10px] border border-border bg-surface p-6">
        <h2 className="text-lg font-bold text-ink">
          Reviews {reviewCount > 0 ? `(${reviewCount})` : ""}
        </h2>

        <div className="mt-5 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            {reviewCount > 0 ? (
              <>
                <p className="text-[42px] font-extrabold tracking-[-0.04em] text-primary">
                  {reviewAverage.toFixed(1)}
                </p>
                <p className="tracking-[0.1em] text-accent">
                  {"★".repeat(Math.round(reviewAverage))}
                </p>
                <p className="mt-1 text-[12.5px] text-muted">{reviewCount} reviews</p>
                <div className="mt-4 flex flex-col gap-1.5">
                  {reviewBars.map((b) => (
                    <div key={b.stars} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-muted">{b.stars}★</span>
                      <div className="h-1.5 flex-1 rounded-full bg-surface-alt">
                        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${b.pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted">{b.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">No reviews yet.</p>
            )}

            {user ? (
              <div className="mt-5 flex flex-col gap-2.5 rounded-lg bg-surface-alt p-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      className="text-xl"
                      style={{ color: n <= reviewRating ? "var(--color-accent)" : "var(--color-border)" }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Share your experience with this product…"
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-light"
                />
                <Button
                  variant="secondary"
                  className="w-fit"
                  disabled={!reviewBody.trim() || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate()}
                >
                  {reviewMutation.isPending ? "Submitting…" : "Write a review"}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            {!reviews || reviews.length === 0 ? (
              <p className="text-sm text-muted">Be the first to write one.</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="border-t border-[#F1EAE6] pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink-dark">
                      {r.profiles?.full_name ?? "Customer"}
                    </span>
                    <span className="text-xs text-accent">{"★".repeat(r.rating)}</span>
                  </div>
                  {r.body ? <p className="mt-1 text-sm text-ink-dark">{r.body}</p> : null}
                  {r.vendor_reply ? (
                    <div className="mt-2 rounded-lg bg-primary-tint p-2.5 text-xs text-primary">
                      <strong className="font-bold">Vendor reply:</strong> {r.vendor_reply}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* questions */}
      <div id="ask-a-question" className="mt-8 rounded-[10px] border border-border bg-surface p-6">
        <div className="rounded-[10px] border border-[#EFCBBB] bg-accent-tint p-5">
          <p className="text-[15px] font-bold text-ink">Ask a question</p>
          <p className="mt-1 text-[12.5px] text-muted">
            {product.vendors?.store_name ?? "The vendor"} usually replies within a few hours
            during store hours.
          </p>
          {user ? (
            <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
              <input
                placeholder="e.g. Does this come with a warranty?"
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
                className="flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-light"
              />
              <button
                type="button"
                disabled={!questionDraft.trim() || questionMutation.isPending}
                onClick={() => questionMutation.mutate()}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {questionMutation.isPending ? "Sending…" : "Submit question"}
              </button>
            </div>
          ) : (
            <Link href="/login" className="mt-3 inline-block text-sm font-bold text-primary">
              Sign in to ask a question
            </Link>
          )}
        </div>

        <div className="mt-5">
          <p className="text-[15px] font-bold text-ink">
            {questions && questions.length > 0 ? `${questions.length} answered questions` : "No questions yet"}
          </p>
          <div className="mt-3 flex flex-col gap-3.5">
            {questions?.map((q) => (
              <div key={q.id} className="border-t border-[#F1EAE6] pt-3.5 first:border-t-0 first:pt-0">
                <p className="text-sm text-ink-dark">
                  <span className="font-mono font-bold text-primary">Q:</span> {q.question}
                </p>
                {q.answer ? (
                  <p className="mt-1.5 text-sm text-ink-dark">
                    <span className="font-mono font-bold text-accent">A:</span> {q.answer}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">Awaiting a reply from the vendor.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* more from this vendor */}
      {moreFromVendor && moreFromVendor.length > 1 ? (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-ink">More from this vendor</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {moreFromVendor
              .filter((p) => p.id !== product.id)
              .slice(0, 5)
              .map((p) => (
                <ProductCard
                  key={p.id}
                  href={`/product/${p.id}`}
                  LinkComponent={Link}
                  imageUrl={p.product_images[0]?.url}
                  name={p.name}
                  price={p.price}
                  compareAtPrice={p.compare_at_price}
                  cod={false}
                />
              ))}
          </div>
        </div>
      ) : null}

      {/* suggested products */}
      {suggested && suggested.length > 1 ? (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-ink">Suggested products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {suggested
              .filter((p) => p.id !== product.id)
              .slice(0, 5)
              .map((p) => (
                <ProductCard
                  key={p.id}
                  href={`/product/${p.id}`}
                  LinkComponent={Link}
                  imageUrl={p.product_images[0]?.url}
                  vendorName={p.vendors?.store_name}
                  name={p.name}
                  price={p.price}
                  compareAtPrice={p.compare_at_price}
                />
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
