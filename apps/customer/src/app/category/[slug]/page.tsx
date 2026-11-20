import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal, TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@kmo/shared/ui/breadcrumbs";
import { categoryProducts, listAllCategories, liveCategoryIds } from "@/lib/seo-data";
import { CATEGORY_COPY, SITE_URL, relatedLandingPages, subCategoryCopy, type LandingPage } from "@/lib/seo-pages";
import { BreadcrumbJsonLd, SeoProductGrid } from "@/components/seo-product-grid";

export const revalidate = 600;

async function load(slug: string) {
  const categories = await listAllCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const parent = category.parent_id ? categories.find((c) => c.id === category.parent_id) : undefined;
  // only sub-categories with live products: an empty one is a dead end
  const live = await liveCategoryIds();
  const children = categories
    .filter((c) => c.parent_id === category.id && live.has(c.id))
    .map((c) => ({ ...c, count: live.get(c.id) ?? 0 }));
  const copy = CATEGORY_COPY[category.slug] ?? subCategoryCopy(category.name, parent?.name);
  return { category, parent, children, copy };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Category not found — Karachi Mart Online" };
  // An empty category is a thin page ("soft 404" to Google): keep it out of
  // the index until it has products, but let crawlers follow its links.
  const empty = (await categoryProducts(data.category.id)).length === 0;
  return {
    title: data.copy.title,
    description: data.copy.description,
    robots: empty ? { index: false, follow: true } : undefined,
    alternates: { canonical: `/category/${slug}` },
    openGraph: { title: data.copy.title, description: data.copy.description, url: `${SITE_URL}/category/${slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { category, parent, children, copy } = data;
  const products = await categoryProducts(category.id);

  const crumbs = [
    { label: "Home", href: "/" },
    ...(parent ? [{ label: parent.name, href: `/category/${parent.slug}` }] : []),
    { label: category.name },
  ];

  return (
    <div className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <Breadcrumbs items={crumbs} LinkComponent={Link} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SITE_URL },
          ...(parent ? [{ name: parent.name, url: `${SITE_URL}/category/${parent.slug}` }] : []),
          { name: category.name, url: `${SITE_URL}/category/${category.slug}` },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink sm:text-[30px]">{category.name}</h1>
        <Link
          href={`/search?category=${category.id}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-[15px] font-bold text-ink-dark hover:border-accent hover:text-accent"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter &amp; sort
        </Link>
      </div>
      <p className="mt-2 max-w-[760px] text-[16px] leading-relaxed text-muted">{copy.intro}</p>

      {children.length > 0 ? (
        // one swipeable row on phones, wrapping on wider screens
        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border-primary bg-white py-1.5 pl-4 pr-1.5 text-[14px] font-semibold text-ink-dark shadow-[0_1px_2px_rgba(74,34,102,0.08)] transition-colors hover:border-primary hover:bg-primary hover:text-white"
            >
              {c.name}
              <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11.5px] font-bold text-primary group-hover:bg-white/20 group-hover:text-white">
                {c.count}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <PopularChips pages={relatedLandingPages(category.slug, parent?.slug)} />

      <div className="mt-6">
        <SeoProductGrid products={products} />
      </div>
    </div>
  );
}

const CHIP =
  "shrink-0 whitespace-nowrap rounded-full border border-accent/25 bg-accent-tint px-3 py-1 text-[13px] font-semibold text-accent transition-colors hover:bg-accent hover:text-white";

/** Popular searches for this category (keyword pages) as quiet filter chips:
 *  2 on phones, 3 on wider screens, the rest behind "See more". Opening it
 *  adds the rest in the same row with "See less" at the end. A hidden
 *  checkbox does the toggling, so it works without JavaScript and the links
 *  are always in the page (only folded), which search engines still follow. */
function PopularChips({ pages }: { pages: LandingPage[] }) {
  if (pages.length === 0) return null;
  const label = (p: LandingPage) => p.h1.replace(/ in Karachi$/, "").replace(/ \(.*\)$/, "");
  const third = pages[2];
  const rest = pages.slice(3);
  const hasMoreOnPhone = !!third || rest.length > 0;
  const hasMoreOnWide = rest.length > 0;
  // folded chips: shown once "See more" is ticked; the 3rd is always shown on wider screens
  const visibility = (i: number) =>
    i < 2 ? "" : i === 2 ? "hidden peer-checked:inline-block sm:inline-block" : "hidden peer-checked:inline-block";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input id="popular-more" type="checkbox" className="peer sr-only" aria-label="Show all popular searches" />
      <span className="flex items-center gap-1 text-[13px] font-semibold text-muted">
        <TrendingUp className="h-4 w-4 text-accent" aria-hidden />
        Popular searches
      </span>
      {pages.map((p, i) => (
        <Link key={p.slug} href={`/${p.slug}`} className={`${CHIP} ${visibility(i)}`}>
          {label(p)}
        </Link>
      ))}
      {hasMoreOnPhone ? (
        <>
          <label
            htmlFor="popular-more"
            className={`cursor-pointer select-none text-[13px] font-semibold text-accent hover:underline peer-checked:hidden ${hasMoreOnWide ? "" : "sm:hidden"}`}
          >
            See more ▾
          </label>
          <label
            htmlFor="popular-more"
            className={`hidden cursor-pointer select-none text-[13px] font-semibold text-accent hover:underline peer-checked:inline ${hasMoreOnWide ? "" : "sm:!hidden"}`}
          >
            See less ▴
          </label>
        </>
      ) : null}
    </div>
  );
}
