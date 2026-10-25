"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { WhatsAppButton } from "./whatsapp-button";
import { ReferralCapture } from "./referral-capture";

const NO_CHROME_PREFIXES = ["/login", "/signup"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = NO_CHROME_PREFIXES.some((p) => pathname?.startsWith(p));

  // On refresh the browser restores the old scroll position before the page's
  // content has loaded, which lands on the footer. Always start at the top.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (window.location.hash) return;
    window.scrollTo(0, 0);
    // Content (products, images) arrives after the first paint and some
    // browsers jump to keep the old position; hold the top until the visitor
    // scrolls themselves or the page has settled.
    let userMoved = false;
    const mark = () => (userMoved = true);
    const opts = { passive: true } as const;
    window.addEventListener("wheel", mark, opts);
    window.addEventListener("touchstart", mark, opts);
    window.addEventListener("keydown", mark);
    const hold = window.setInterval(() => {
      if (!userMoved && window.scrollY > 0) window.scrollTo(0, 0);
    }, 100);
    const stop = window.setTimeout(() => window.clearInterval(hold), 3000);
    return () => {
      window.clearInterval(hold);
      window.clearTimeout(stop);
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchstart", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);

  // Every page change opens at the top, even while the new page is still loading.
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  if (hideChrome) {
    return (
      <>
        {children}
        <WhatsAppButton />
        <ReferralCapture />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-[70vh] flex-1 flex-col">{children}</div>
      <SiteFooter />
      <WhatsAppButton />
      <ReferralCapture />
    </>
  );
}
