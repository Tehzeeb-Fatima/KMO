/** Meta (Facebook) Pixel for the vendor site: loaded only when
 *  VITE_META_PIXEL_ID is set, and only where an event is sent (vendor signup). */

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID ?? "";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

function loadPixel(): boolean {
  if (!PIXEL_ID || typeof window === "undefined") return false;
  if (window.fbq) return true;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  window.fbq = n;
  window._fbq = n;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  n("init", PIXEL_ID);
  n("track", "PageView");
  return true;
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  try {
    if (loadPixel()) window.fbq?.("track", name, params);
  } catch {
    // tracking must never break signup
  }
}
