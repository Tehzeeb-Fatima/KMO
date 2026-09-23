import { RotateCcw } from "lucide-react";
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
  /** Shows a small "360°" badge — the viewer itself only loads on the detail page. */
  has360?: boolean;
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
  has360 = false,
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
        "block overflow-hidden rounded-lg border border-border bg-surface",
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
        className="relative mt-2.5 flex aspect-[16/10] items-end p-2.5"
        style={{
          background: imageUrl
            ? `url(${imageUrl}) center/cover`
            : "repeating-linear-gradient(135deg,#F3ECE8 0 8px,#E9DFD9 8px 16px)",
        }}
      >
        {discountPct ? (
          <span className="rounded bg-accent px-[7px] py-1 text-[10.5px] font-bold text-white">
            -{discountPct}%
          </span>
        ) : null}
        {has360 ? (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-[3px] text-[9.5px] font-bold text-white">
            <RotateCcw className="h-2.5 w-2.5" />
            360°
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 p-3.5">
        <p className="line-clamp-2 text-[13.5px] font-medium leading-[1.45] text-ink-dark">
          {name}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-[-0.025em] text-primary">
            Rs. {price.toLocaleString()}
          </span>
          {compareAtPrice && compareAtPrice > price ? (
            <span className="text-[12.5px] text-[#A79A94] line-through">
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
      </div>
    </LinkComponent>
  );
}
