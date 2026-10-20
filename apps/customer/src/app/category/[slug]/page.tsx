import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@kmo/shared/ui/breadcrumbs";
import { categoryProducts, listAllCategories } from "@/lib/seo-data";
import { CATEGORY_COPY, SITE_URL, subCategoryCopy } from "@/lib/seo-pages";
import { BreadcrumbJsonLd, SeoProductGrid } from "@/components/seo-product-grid";

export const revalidate = 600;

async function load(slug: string) {
  const categories = await listAllCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const parent = category.parent_id ? categories.find((c) => c.id === category.parent_id) : undefined;
  const children = categories.filter((c) => c.parent_id === category.id);
  const copy = CATEGORY_COPY[category.slug] ?? subCategoryCopy(category.name, parent?.name);
  return { category, parent, children, copy };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Category not found — Karachi Mart Online" };
  return {
    title: data.copy.title,
    description: data.copy.description,
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
        <div className="mt-4 flex flex-wrap gap-2">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[14px] font-semibold text-ink-dark hover:border-accent hover:text-accent"
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        <SeoProductGrid products={products} />
      </div>
    </div>
  );
}
