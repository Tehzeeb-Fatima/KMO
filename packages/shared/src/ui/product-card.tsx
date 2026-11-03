import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { cdnImage } from "../lib/product-image";
import { SaleTagBadge } from "./sale-tag";

export interface ProductCardProps {
  href: string;
  imageUrl?: string | null;
  vendorName?: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  rating?: number;
  ratingCount?: number;
  cod?: boolean;
  /** Promotion label (admin-set); replaces the "-X%" badge when present. */
  promoLabel?: string | null;
  /** Admin-set "N sold" tag, shown on the photo. */
  soldBadge?: number | null;
  /** Top-right of the image, e.g. a wishlist heart. */
  topRight?: ReactNode;
  /** Below the price, e.g. an add-to-cart button. */
  footer?: ReactNode;
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
  className?: string;
}

const DefaultLink = ({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <a href={href} className={className}>
    {children}
  </a>
);

/** The product-card pattern reused across the homepage grid, vendor
 * storefront, and search results (see /design-reference/NOTES.md). */
export function ProductCard({
  href,
  imageUrl,
  vendorName,
  name,
  price,
  compareAtPrice,
  rating,
  ratingCount,
  cod = true,
  promoLabel,
  soldBadge,
  topRight,
  footer,
  LinkComponent = DefaultLink,
  className,
}: ProductCardProps) {
  const discountPct =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : null;

  return (
    <LinkComponent
      href={href}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border-primary bg-primary-tint-2 transition-shadow duration-200 hover:shadow-[0_10px_26px_-10px_rgba(74,34,102,0.5)]",
        className,
      )}
    >
      {vendorName ? (
        <div className="flex items-center justify-between px-3.5 pt-3">
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.1em] text-muted-table">
            {vendorName}
          </span>
          {cod ? (
            <span className="rounded bg-primary-tint px-[5px] py-[3px] font-mono text-[10.5px] tracking-[0.08em] text-primary">
              COD
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className="relative mt-2.5 aspect-square bg-white"
        style={{
          background: imageUrl
            ? `#fff url(${cdnImage(imageUrl, 500)}) center/cover no-repeat`
            : "repeating-linear-gradient(135deg,#F3ECE8 0 8px,#E9DFD9 8px 16px)",
        }}
      >
        {imageUrl ? (
          // A real <img> over the background so search engines index the photo.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cdnImage(imageUrl, 500)} alt={name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        {promoLabel ? (
          <span className="absolute left-2.5 top-2.5 rounded bg-accent px-[7px] py-1 text-[12px] font-bold text-white">
            {promoLabel}
          </span>
        ) : discountPct ? (
          <SaleTagBadge className="absolute left-2.5 top-2.5 rounded bg-primary px-[7px] py-1 text-[11px] font-bold text-white" />
        ) : null}
        {topRight ? <div className="absolute right-2.5 top-2.5">{topRight}</div> : null}
      </div>

      {/* every card the same height: the name always reserves two lines and
          the footer sits at the bottom */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="line-clamp-2 min-h-[2.9em] text-[15.5px] font-medium leading-[1.45] text-ink-dark [unicode-bidi:plaintext]">
          {name}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-primary sm:text-lg sm:tracking-[-0.025em]">
            Rs. {price.toLocaleString()}
          </span>
          {discountPct ? (
            <span className="text-[13px] font-semibold text-accent sm:text-[14px]">-{discountPct}%</span>
          ) : null}
        </div>
        {typeof rating === "number" || soldBadge ? (
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
            {typeof rating === "number" ? (
              <span>
                <span className="text-[#f5a623]">★</span> {rating.toFixed(1)}
                {ratingCount ? ` (${ratingCount.toLocaleString()})` : null}
              </span>
            ) : null}
            {soldBadge ? <span>{soldBadge.toLocaleString()} sold</span> : null}
          </p>
        ) : null}
        {footer ? <div className="mt-auto pt-1">{footer}</div> : null}
      </div>
    </LinkComponent>
  );
}
