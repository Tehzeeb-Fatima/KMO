"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

const NO_CHROME_PREFIXES = ["/login", "/signup"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = NO_CHROME_PREFIXES.some((p) => pathname?.startsWith(p));

  if (hideChrome) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}
