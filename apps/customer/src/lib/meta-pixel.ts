/** Meta (Facebook) Pixel helpers. Every call is a no-op until the pixel has
 *  loaded, and the pixel only loads when NEXT_PUBLIC_META_PIXEL_ID is set, so
 *  nothing here can break a page. */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Fbq = (command: string, event: string, params?: Record<string, unknown>, options?: { eventID?: string }) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>, eventId?: string): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", name, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    // tracking must never break the page
  }
}

/** Purchase fires once per order, even if the confirmation page is refreshed. */
export function trackPurchaseOnce(orderKey: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  const key = `kmo-pixel-purchase:${orderKey}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // no storage: still send it once for this page view
  }
  trackEvent("Purchase", params, orderKey);
}
