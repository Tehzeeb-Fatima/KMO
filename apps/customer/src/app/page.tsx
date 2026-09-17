"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  listCategories,
  listPublishedProducts,
  listVendors,
  listRecentReviews,
  getSiteRatingSummary,
  submitContactMessage,
} from "@kmo/shared/api";
import { ProductCard } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";

export default function Home() {
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
            7,400 VERIFIED KARACHI SELLERS
          </p>
          <h1 className="text-[32px] font-extrabold leading-[1.05] tracking-[-0.038em] text-white sm:text-[44px]">
            Shop local.
            <br />
            Support your city.
          </h1>
          <p className="max-w-[400px] text-[15px] leading-[1.6] text-[#D5C4E2]">
            From Tariq Road to Empress Market, delivered anywhere in the city.
          </p>
          <Link
            href="/search"
            className="mt-1 w-fit rounded-[7px] bg-accent px-7 py-3.5 text-sm font-bold text-white"
          >
            Start shopping
          </Link>
        </div>

        {/* panel B — COD callout */}
        <div className="flex flex-col justify-between gap-3 rounded-lg bg-accent p-[26px]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-tint" />
              <span className="font-mono text-[10px] tracking-[0.16em] text-[#F8E4DA]">
                PAYMENT
              </span>
            </div>
            <h2 className="text-2xl font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
              Cash on delivery, citywide
            </h2>
            <p className="text-[13px] leading-[1.55] text-[#F8E4DA]">
              Pay the rider, not a form. All 18 Karachi towns, up to Rs. 50,000 per order.
            </p>
          </div>
          <Link href="/faqs" className="text-[13px] font-bold text-white">
            How COD works →
          </Link>
        </div>

        {/* panel C — vendor of the week */}
        <div className="flex flex-col justify-between gap-3 rounded-lg border-[1.5px] border-primary p-[26px]">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted-table">
              VENDOR OF THE WEEK
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
                        ? `${vendorOfWeekProductCount} products`
                        : "New to KMO"}
                    </p>
                  </div>
                </div>
                <div className="h-[82px] rounded-md bg-surface-alt" />
              </>
            ) : (
              <p className="text-sm text-muted">New vendors join every week.</p>
            )}
          </div>
          {vendorOfWeek ? (
            <Link href={`/store/${vendorOfWeek.slug}`} className="text-[13px] font-bold text-accent">
              Visit store →
            </Link>
          ) : null}
        </div>
      </section>

      {/* browse categories */}
      {categories && categories.length > 0 ? (
        <section className="px-4 pt-8 sm:px-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
              Browse categories
            </h2>
            <Link href="/search" className="text-[13px] font-bold text-accent">
              All categories →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/search?category=${c.id}`}
                className="w-[128px] shrink-0 overflow-hidden rounded-lg border border-border bg-surface sm:w-[158px]"
              >
                <div className="h-[74px] bg-surface-alt sm:h-[98px]" />
                <div className="flex flex-col gap-0.5 p-3">
                  <span className="line-clamp-1 text-[12.5px] font-bold text-ink-dark">{c.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* featured vendors — 3 col */}
      <section id="featured-vendors" className="px-4 pt-8 sm:px-10">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
              Featured vendors
            </h2>
            <p className="text-[13.5px] text-muted">Established Karachi shops, verified by KMO</p>
          </div>
          <Link href="/search" className="shrink-0 text-[13px] font-bold text-accent">
            See all vendors →
          </Link>
        </div>
        {!vendors || vendors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
            No vendors have been approved yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {vendors.slice(0, 6).map((v) => (
              <Link
                key={v.id}
                href={`/store/${v.slug}`}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <div className="h-[76px] bg-surface-alt" />
                <div className="-mt-[34px] flex flex-col gap-2.5 p-4">
                  <span className="flex h-[50px] w-[50px] items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white ring-[3px] ring-white">
                    {v.store_name.charAt(0)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[15.5px] font-bold tracking-[-0.015em] text-ink-dark">
                      {v.store_name}
                    </span>
                    <span className="rounded bg-danger-tint px-[5px] py-[3px] font-mono text-[9px] tracking-[0.05em] text-danger">
                      VERIFIED
                    </span>
                  </div>
                  {v.description ? (
                    <p className="line-clamp-2 text-[13px] leading-[1.55] text-muted">
                      {v.description}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between border-t border-[#F1EAE6] pt-[11px] text-[12.5px]">
                    <span className="text-muted">{v.area || "Karachi"}</span>
                    <span className="font-bold text-primary">Visit →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* featured products — 4 col */}
      <FeaturedProducts products={products} />

      {/* ratings & reviews summary */}
      {ratingSummary && ratingSummary.count > 0 ? (
        <section className="px-4 pt-8 sm:px-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
              Ratings &amp; reviews
            </h2>
            <Link href="/search" className="text-[13px] font-bold text-accent">
              See all reviews →
            </Link>
          </div>
          <div className="grid gap-[26px] lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-[10px] border border-border bg-surface p-6">
              <p className="text-[42px] font-extrabold tracking-[-0.04em] text-primary">
                {ratingSummary.average.toFixed(1)}
              </p>
              <p className="tracking-[0.1em] text-accent">{"★".repeat(Math.round(ratingSummary.average))}</p>
              <p className="mt-1 text-[12.5px] text-muted">
                {ratingSummary.count.toLocaleString()} ratings across all vendors
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

function FeaturedProducts({
  products,
}: {
  products: Awaited<ReturnType<typeof listPublishedProducts>> | undefined;
}) {
  const [filter, setFilter] = useState<"popular" | "new" | "cod">("popular");

  return (
    <section className="px-4 pt-8 sm:px-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
          Featured products
        </h2>
        <div className="flex gap-2">
          {(
            [
              { key: "popular", label: "Popular" },
              { key: "new", label: "New in" },
              { key: "cod", label: "COD only" },
            ] as const
          ).map((opt) => (
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
          Products will appear here as vendors publish their catalogues.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {products.map((p) => (
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
  return (
    <section className="mt-8 bg-accent-tint px-4 pb-9 pt-9 sm:px-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-[-0.025em] text-ink sm:text-[21px]">
          What Karachi is saying
        </h2>
        <p className="text-[13.5px] text-muted">Real feedback from customers across the city</p>
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
          <p className="font-mono text-[10.5px] tracking-[0.16em] text-accent">GET IN TOUCH</p>
          <h2 className="text-[26px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink">
            Have a question? Contact us.
          </h2>
          <p className="max-w-[340px] text-sm leading-[1.65] text-muted">
            For order help, vendor onboarding, or anything else — send a message and our
            Karachi-based support team will get back to you.
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
              <span className="text-[13.5px] text-ink-dark">Mon–Sat, 9:00 AM – 9:00 PM</span>
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
            <p className="text-[12.5px] font-bold text-success">
              Thanks — we&rsquo;ve received your message and will reply within one business
              day.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label="First name">
                  <input
                    required
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    required
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field label="Phone number">
                  <input
                    required
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </Field>
                <Field label="Business name" optional>
                  <input
                    placeholder="Your shop name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
                  />
                </Field>
              </div>
              <Field label="Message">
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us what you need help with…"
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
                {mutation.isPending ? "Sending…" : "Send message"}
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
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <span className="text-[12.5px] font-bold text-ink-dark">
        {label}
        {optional ? <span className="font-medium text-muted-table"> (optional)</span> : null}
      </span>
      {children}
    </div>
  );
}
