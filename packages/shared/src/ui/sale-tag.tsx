"use client";

import { createContext, useContext, type ReactNode } from "react";

/** The admin-set sale tag (e.g. "11.11 SALE") shown beside the "-X%" badge
 *  of every discounted product while product discounts are on. */
const SaleTagContext = createContext<string | null>(null);

export function SaleTagProvider({ tag, children }: { tag: string | null; children: ReactNode }) {
  return <SaleTagContext.Provider value={tag?.trim() || null}>{children}</SaleTagContext.Provider>;
}

export function useSaleTag(): string | null {
  return useContext(SaleTagContext);
}

export function SaleTagBadge({ className }: { className?: string }) {
  const tag = useSaleTag();
  if (!tag) return null;
  return <span className={className}>{tag}</span>;
}
