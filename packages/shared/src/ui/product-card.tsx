import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface ProductCardProps {
  href: string;
  imageUrl?: string | null;
  vendorName?: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  rating?: number;
  soldCount?: number;
  cod?: boolean;
  /** Promotion label (admin-set); replaces the "-X%" badge when present. */
  promoLabel?: string | null;
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
  soldCount,
  cod = true,
  promoLabel,
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
          <span className="truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-table">
            {vendorName}
          </span>
          {cod ? (
            <span className="rounded bg-primary-tint px-[5px] py-[3px] font-mono text-[9px] tracking-[0.08em] text-primary">
              COD
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className="relative mt-2.5 aspect-square bg-white"
        style={{
          background: imageUrl
            ? `#fff url(${imageUrl}) center/cover no-repeat`
            : "repeating-linear-gradient(135deg,#F3ECE8 0 8px,#E9DFD9 8px 16px)",
        }}
      >
        {promoLabel ? (
          <span className="absolute left-2.5 top-2.5 rounded bg-accent px-[7px] py-1 text-[10.5px] font-bold text-white">
            {promoLabel}
          </span>
        ) : discountPct ? (
          <span className="absolute left-2.5 top-2.5 rounded bg-accent px-[7px] py-1 text-[10.5px] font-bold text-white">
            -{discountPct}%
          </span>
        ) : null}
        {topRight ? <div className="absolute right-2.5 top-2.5">{topRight}</div> : null}
      </div>

      {/* every card the same height: the name always reserves two lines and
          the footer sits at the bottom */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="line-clamp-2 min-h-[2.9em] text-[13.5px] font-medium leading-[1.45] text-ink-dark">
          {name}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-[-0.025em] text-primary">
            Rs. {price.toLocaleString()}
          </span>
          {compareAtPrice && compareAtPrice > price ? (
            <span className="text-[12.5px] font-semibold text-ink-dark line-through decoration-danger decoration-2">
              Rs. {compareAtPrice.toLocaleString()}
            </span>
          ) : null}
        </div>
        {typeof rating === "number" ? (
          <p className="text-[11.5px] text-muted">
            <span className="font-bold text-accent">★ {rating.toFixed(1)}</span>
            {typeof soldCount === "number" ? ` (${soldCount.toLocaleString()} sold)` : null}
          </p>
        ) : null}
        {footer ? <div className="mt-auto pt-1">{footer}</div> : null}
      </div>
    </LinkComponent>
  );
}
