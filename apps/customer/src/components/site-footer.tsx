import Link from "next/link";

const COLUMNS = [
  {
    heading: "Shop",
    links: [
      { href: "/search", label: "Categories" },
      { href: "/#featured-vendors", label: "Featured vendors" },
      { href: "/search", label: "Deals" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/#contact-us", label: "Contact us" },
      { href: "/account/orders", label: "Track my order" },
      { href: "/shipping-policy", label: "Shipping & returns" },
    ],
  },
  {
    heading: "Sell",
    links: [
      { href: "/vendor/signup", label: "Become a vendor" },
      { href: "/vendor", label: "Vendor dashboard" },
      { href: "/return-policy", label: "Vendor policies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-sidebar">
      <div className="mx-auto grid w-full max-w-[1358px] grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4 sm:px-10">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          <div className="flex items-center gap-[11px]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              KM
            </span>
            <span className="text-base font-extrabold text-white">Karachi Mart</span>
          </div>
          <p className="max-w-[280px] text-[13px] leading-[1.6] text-[#B9A3CD]">
            A marketplace for one city. Verified Karachi vendors, cash on delivery, and
            delivery you can plan around.
          </p>
        </div>

        {COLUMNS.map((col) => (
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
          © {new Date().getFullYear()} Karachi Mart Online. All rights reserved.
        </p>
        <p className="text-xs text-[#8A749E]">Cash on delivery available citywide</p>
      </div>
    </footer>
  );
}
