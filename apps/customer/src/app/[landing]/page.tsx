import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@kmo/shared/ui/breadcrumbs";
import { landingProducts } from "@/lib/seo-data";
import { LANDING_PAGES, SITE_URL } from "@/lib/seo-pages";
import { BreadcrumbJsonLd, SeoFaqs, SeoProductGrid } from "@/components/seo-product-grid";

/** Keyword landing pages (e.g. /mitti-ke-bartan). Only the listed slugs exist. */
export const dynamicParams = false;
export const revalidate = 600;

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ landing: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ landing: string }> }): Promise<Metadata> {
  const { landing } = await params;
  const page = LANDING_PAGES.find((p) => p.slug === landing);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: `${SITE_URL}/${page.slug}` },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ landing: string }> }) {
  const { landing } = await params;
  const page = LANDING_PAGES.find((p) => p.slug === landing);
  if (!page) notFound();
  const products = await landingProducts(page);

  return (
    <div className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: page.h1 }]} LinkComponent={Link} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SITE_URL },
          { name: page.h1, url: `${SITE_URL}/${page.slug}` },
        ]}
      />
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink sm:text-[30px]">{page.h1}</h1>
      <div className="mt-2 flex max-w-[760px] flex-col gap-2 text-[14px] leading-relaxed text-muted">
        {page.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <div className="mt-6">
        <SeoProductGrid products={products} />
      </div>

      <SeoFaqs faqs={page.faqs} />
    </div>
  );
}
