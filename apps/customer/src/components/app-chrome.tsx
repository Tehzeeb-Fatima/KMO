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
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);

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
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      <WhatsAppButton />
      <ReferralCapture />
    </>
  );
}
