import { useState } from "react";
import type { ProductWithMedia } from "@kmo/shared/api";

/** Shows a product the way it will look on the storefront, straight from
 *  already-loaded admin data — works for pending/rejected products too,
 *  since the live customer site only shows published ones. */
export function ProductPreviewModal({ product, onClose }: { product: ProductWithMedia; onClose: () => void }) {
  const images = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
  const [activeImage, setActiveImage] = useState(0);

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  const variantsByOption = new Map<string, typeof product.product_variants>();
  for (const v of product.product_variants) {
    const list = variantsByOption.get(v.option_name) ?? [];
    list.push(v);
    variantsByOption.set(v.option_name, list);
  }

  const outOfStock =
    product.product_variants.length === 0 && product.stock_quantity !== null && product.stock_quantity <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[88vh] w-full max-w-[920px] flex-col overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <p className="text-[13px] font-bold text-ink-dark">Storefront preview</p>
            <p className="text-[11.5px] text-muted">
              What a customer sees on this product&rsquo;s page — not a live page, since it isn&rsquo;t published yet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-[12px] font-bold text-ink-dark"
          >
            Close
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 sm:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-alt">
              {images[activeImage] ? (
                <img
                  src={images[activeImage].url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted">No image</div>
              )}
            </div>
            {images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-md border"
                    style={{ borderColor: i === activeImage ? "var(--color-accent)" : "var(--color-border)" }}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-table">
                {product.vendors?.store_name ?? "Store"}
                {product.brand ? ` · ${product.brand}` : ""}
              </p>
              <h2 className="mt-1 text-xl font-bold leading-tight text-ink">{product.name}</h2>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-extrabold tracking-[-0.03em] text-primary">
                Rs. {product.price.toLocaleString()}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price ? (
                <>
                  <span className="text-[14px] font-semibold text-muted line-through">
                    Rs. {product.compare_at_price.toLocaleString()}
                  </span>
                  {discountPercent ? (
                    <span className="rounded-full bg-primary-tint px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {discountPercent}% off
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>

            <p className="text-[12.5px] font-semibold" style={{ color: outOfStock ? "var(--color-danger)" : "var(--color-success)" }}>
              {outOfStock
                ? "Out of stock"
                : product.stock_quantity === null
                  ? "In stock"
                  : `In stock (${product.stock_quantity} available)`}
            </p>

            {[...variantsByOption.entries()].map(([optionName, variants]) => (
              <div key={optionName} className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-muted">{optionName}</span>
                <div className="flex flex-wrap gap-1.5">
                  {variants.map((v) => (
                    <span
                      key={v.id}
                      className="rounded-full border border-border px-3 py-1 text-[12px] font-bold text-ink-dark"
                    >
                      {v.option_value}
                      {v.price_override != null && v.price_override !== product.price
                        ? ` · Rs. ${v.price_override.toLocaleString()}`
                        : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {product.description ? (
              <div>
                <p className="mb-1 text-[12px] font-semibold text-muted">Description</p>
                <p className="whitespace-pre-line text-[13px] leading-[1.6] text-ink-dark">{product.description}</p>
              </div>
            ) : null}

            {product.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded bg-surface-alt px-2 py-1 text-[11px] text-muted-table">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
