import Link from "next/link";

export const metadata = {
  title: "We'll be back soon — Karachi Mart Online",
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar-bg px-4 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none fixed -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/10"
      />

      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#f5ece2]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kmo-icon.png" alt="Karachi Mart" className="h-full w-full object-cover" />
      </span>

      <p className="mt-6 font-mono text-[11px] tracking-[0.22em] text-accent">
        KARACHI MART ONLINE
      </p>

      <h1 className="mt-3 max-w-[560px] text-[32px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white sm:text-[42px]">
        We&rsquo;ll be back in a bit.
      </h1>

      <p className="mt-4 max-w-[440px] text-[15px] leading-[1.6] text-[#D5C4E2]">
        We&rsquo;re doing some quick maintenance to make things better. The site will be back
        online shortly — thanks for your patience.
      </p>

      <div className="mt-9 flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-5 py-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        <span className="text-[12.5px] font-semibold text-white/80">
          Working on it right now
        </span>
      </div>

      <div className="mt-10 flex flex-col items-center gap-1.5 text-[12.5px] text-[#B9A3CD]">
        <span>Need something urgently?</span>
        <a
          href="mailto:support@karachimartonline.com"
          className="font-semibold text-white hover:text-accent"
        >
          support@karachimartonline.com
        </a>
      </div>

      <Link
        href="/login"
        className="mt-12 text-[11px] font-medium text-[#7B5A96] hover:text-[#B9A3CD]"
      >
        Team sign in
      </Link>
    </div>
  );
}
