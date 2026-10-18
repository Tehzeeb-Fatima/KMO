"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/share/18hwkW51XP/", label: "Facebook", path: "M14 8h3V4h-3c-2.8 0-4.5 1.7-4.5 4.5V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8Z" },
  { href: "https://www.instagram.com/karachimartonline/", label: "Instagram", path: "M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.9-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM12 3.5c-2.3 0-2.6 0-3.5.1-3.1.1-4.8 1.8-4.9 4.9-.1.9-.1 1.2-.1 3.5s0 2.6.1 3.5c.1 3.1 1.8 4.8 4.9 4.9.9.1 1.2.1 3.5.1s2.6 0 3.5-.1c3.1-.1 4.8-1.8 4.9-4.9.1-.9.1-1.2.1-3.5s0-2.6-.1-3.5c-.1-3.1-1.8-4.8-4.9-4.9-.9-.1-1.2-.1-3.5-.1Zm0 1.6c2.3 0 2.5 0 3.4.1 2.2.1 3.3 1.2 3.4 3.4.1.9.1 1.1.1 3.4s0 2.5-.1 3.4c-.1 2.2-1.2 3.3-3.4 3.4-.9.1-1.1.1-3.4.1s-2.5 0-3.4-.1c-2.2-.1-3.3-1.2-3.4-3.4-.1-.9-.1-1.1-.1-3.4s0-2.5.1-3.4c.1-2.2 1.2-3.3 3.4-3.4.9-.1 1.1-.1 3.4-.1Z" },
  { href: "https://www.tiktok.com/@karachi.mart.online", label: "TikTok", path: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z" },
];

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
        { href: "/track-order", label: t.footer.trackOrder },
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
    <footer className="bg-sidebar print:hidden">
      <div className="mx-auto grid w-full max-w-[1358px] grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-3 sm:px-10 lg:grid-cols-5">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          <Link href="/" aria-label="Karachi Mart home" className="flex w-fit items-center gap-[11px]">
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#f5ece2]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kmo-icon.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="text-base font-extrabold text-white">Karachi Mart</span>
          </Link>
          <p className="max-w-[280px] text-[13px] leading-[1.6] text-[#B9A3CD]">
            {t.footer.description}
          </p>
          <div className="mt-1 flex flex-col gap-2 text-[13px]">
            <a
              href="mailto:contact@karachimartonline.com"
              className="flex w-fit items-center gap-2 text-[#D5C4E2] hover:text-white"
            >
              <Mail className="h-4 w-4 shrink-0 text-[#B9A3CD]" />
              contact@karachimartonline.com
            </a>
            <a href="tel:+923712104790" className="flex w-fit items-center gap-2 text-[#D5C4E2] hover:text-white">
              <Phone className="h-4 w-4 shrink-0 text-[#B9A3CD]" />
              <span dir="ltr">+92 371 2104790</span>
            </a>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#45305C] text-[#D5C4E2] hover:bg-accent hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
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
