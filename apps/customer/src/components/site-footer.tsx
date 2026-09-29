"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";

const VENDOR_URL = process.env.NEXT_PUBLIC_VENDOR_URL ?? "https://vendor.karachimartonline.com";

export function SiteFooter() {
  const { t } = useLanguage();

  const columns = [
    {
      heading: t.footer.shop,
      links: [
        { href: "/search", label: t.footer.categories },
        { href: "/#featured-vendors", label: t.footer.featuredVendors },
        { href: "/search", label: t.footer.deals },
      ],
    },
    {
      heading: t.footer.support,
      links: [
        { href: "/#contact-us", label: t.footer.contactUs },
        { href: "/account/orders", label: t.footer.trackOrder },
        { href: "/shipping-policy", label: t.footer.shippingReturns },
      ],
    },
    {
      heading: t.footer.sell,
      links: [
        { href: `${VENDOR_URL}/signup`, label: t.footer.becomeVendor },
        { href: VENDOR_URL, label: t.footer.vendorDashboard },
        { href: "/vendor-agreement", label: t.footer.vendorAgreement },
      ],
    },
    {
      heading: t.footer.company,
      links: [
        { href: "/about", label: t.footer.aboutUs },
        { href: "/faqs", label: t.footer.faqs },
        { href: "/terms", label: t.footer.terms },
        { href: "/privacy", label: t.footer.privacy },
      ],
    },
  ];

  return (
    <footer className="bg-sidebar">
      <div className="mx-auto grid w-full max-w-[1358px] grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-3 sm:px-10 lg:grid-cols-5">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          <div className="flex items-center gap-[11px]">
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#f5ece2]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kmo-icon.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="text-base font-extrabold text-white">Karachi Mart</span>
          </div>
          <p className="max-w-[280px] text-[13px] leading-[1.6] text-[#B9A3CD]">
            {t.footer.description}
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.heading}>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7B5A96]">
              {col.heading}
            </p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {col.links.map((link, i) => (
                <li key={link.label + i}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] text-[#D5C4E2] hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-[1358px] flex-col items-center justify-between gap-2 border-t border-[#45305C] px-4 py-5 text-center sm:flex-row sm:px-10 sm:text-left">
        <p className="text-xs text-[#8A749E]">
          © {new Date().getFullYear()} {t.footer.rightsReserved}
        </p>
        <p className="text-xs text-[#8A749E]">{t.footer.codAvailable}</p>
      </div>
    </footer>
  );
}
