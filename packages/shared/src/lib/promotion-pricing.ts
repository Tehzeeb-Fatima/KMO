/**
 * Same matching/discount math as the `place_order` edge function — kept as a
 * pure function so the checkout page can show the customer the exact total
 * they're about to be charged, not just an estimate that then changes once
 * the order is actually created server-side.
 */

export interface PromotionForPricing {
  id: string;
  vendor_id: string | null;
  category_id: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  vendor_funded_percent: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  /** Non-empty when the promotion is scoped to specific products (possibly
   *  across several vendors) rather than a whole vendor/category — when set,
   *  this is the *only* match rule; vendor_id/category_id are ignored. */
  product_ids: string[];
}

export interface PricingLineItem {
  productId: string;
  vendorId: string;
  categoryId: string | null;
  unitPrice: number;
  quantity: number;
}

function unitDiscount(promo: PromotionForPricing, unitPrice: number): number {
  if (promo.discount_type === "percentage") return unitPrice * (promo.discount_value / 100);
  return Math.max(0, unitPrice - promo.discount_value);
}

function matchesItem(
  promo: PromotionForPricing,
  vendorId: string,
  item: { productId: string; categoryId: string | null },
): boolean {
  if (promo.product_ids.length > 0) return promo.product_ids.includes(item.productId);
  if (promo.vendor_id && promo.vendor_id !== vendorId) return false;
  if (promo.category_id && promo.category_id !== item.categoryId) return false;
  return true;
}

/** The best-matching active promotion for one vendor's items in the cart, if any. */
export function bestPromotionForVendor(
  vendorId: string,
  vendorItems: PricingLineItem[],
  vendorSubtotal: number,
  activePromotions: PromotionForPricing[],
): { promotion: PromotionForPricing | null; discountAmount: number } {
  let best: PromotionForPricing | null = null;
  let bestDiscount = 0;

  for (const promo of activePromotions) {
    if (promo.product_ids.length === 0 && promo.vendor_id && promo.vendor_id !== vendorId) continue;
    if (promo.min_order_amount && vendorSubtotal < promo.min_order_amount) continue;

    let raw = 0;
    for (const item of vendorItems) {
      if (!matchesItem(promo, vendorId, item)) continue;
      raw += unitDiscount(promo, item.unitPrice) * item.quantity;
    }
    if (raw <= 0) continue;

    const capped = promo.max_discount_amount ? Math.min(raw, promo.max_discount_amount) : raw;
    if (capped > bestDiscount) {
      bestDiscount = capped;
      best = promo;
    }
  }

  return { promotion: best, discountAmount: Math.round(bestDiscount * 100) / 100 };
}

/** The best-matching active promotion for a single product, e.g. for the
 *  product detail page's price/discount badge — same match rules as
 *  checkout, just for one item instead of a vendor's whole cart group. */
export function bestPromotionForProduct(
  product: { id: string; vendorId: string; categoryId: string | null },
  unitPrice: number,
  activePromotions: PromotionForPricing[],
): { promotion: PromotionForPricing | null; discountedPrice: number; percentOff: number } {
  let best: PromotionForPricing | null = null;
  let bestDiscount = 0;

  for (const promo of activePromotions) {
    if (!matchesItem(promo, product.vendorId, { productId: product.id, categoryId: product.categoryId }))
      continue;
    const raw = unitDiscount(promo, unitPrice);
    if (raw <= 0) continue;
    const capped = promo.max_discount_amount ? Math.min(raw, promo.max_discount_amount) : raw;
    if (capped > bestDiscount) {
      bestDiscount = capped;
      best = promo;
    }
  }

  if (!best) return { promotion: null, discountedPrice: unitPrice, percentOff: 0 };
  const discountedPrice = Math.max(0, Math.round((unitPrice - bestDiscount) * 100) / 100);
  const percentOff = Math.round((bestDiscount / unitPrice) * 100);
  return { promotion: best, discountedPrice, percentOff };
}

/** Price + "was" price for a product card in a grid (search results, home
 *  sections, a store's product list, etc.) — an active promotion targeting
 *  this product overrides the vendor's own compare_at_price, the same
 *  priority the product detail page uses, so a promoted product shows the
 *  same discount everywhere it appears. */
export function cardPricing(
  product: { id: string; vendorId: string; categoryId: string | null; price: number; compareAtPrice: number | null },
  activePromotions: PromotionForPricing[],
): { price: number; compareAtPrice: number | null } {
  const match = bestPromotionForProduct(
    { id: product.id, vendorId: product.vendorId, categoryId: product.categoryId },
    product.price,
    activePromotions,
  );
  if (match.promotion) return { price: match.discountedPrice, compareAtPrice: product.price };
  return { price: product.price, compareAtPrice: product.compareAtPrice };
}
