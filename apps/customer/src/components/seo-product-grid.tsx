import Link from "next/link";
import { ProductCard } from "@kmo/shared/ui/product-card";
import type { GridProduct } from "@/lib/seo-data";

/** Server-rendered product grid for the category and keyword pages. */
export function SeoProductGrid({ products }: { products: GridProduct[] }) {
  if (products.length === 0) {
    return <p className="text-[15.5px] text-muted">New products are on the way. Please check back soon.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          href={`/product/${p.slug}`}
          LinkComponent={Link}
          imageUrl={p.imageUrl}
          vendorName={p.vendorName}
          name={p.name}
          price={p.price}
          compareAtPrice={p.compareAtPrice}
          promoLabel={p.badgeText}
        />
      ))}
    </div>
  );
}

/** FAQ list plus FAQPage structured data. */
export function SeoFaqs({ faqs }: { faqs: { q: string; a: string }[] }) {
  if (faqs.length === 0) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-ink">Frequently asked questions</h2>
      <div className="mt-3 flex flex-col gap-2.5">
        {faqs.map((f) => (
          <details key={f.q} className="rounded-lg border border-border bg-surface px-4 py-3">
            <summary className="cursor-pointer text-[16px] font-semibold text-ink-dark">{f.q}</summary>
            <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
