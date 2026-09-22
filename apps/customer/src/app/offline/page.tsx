export const metadata = {
  title: "You're offline — Karachi Mart Online",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar-bg px-4 py-16 text-center">
      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#f5ece2]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kmo-icon.png" alt="Karachi Mart" className="h-full w-full object-cover" />
      </span>

      <p className="mt-6 font-mono text-[11px] tracking-[0.22em] text-accent">
        KARACHI MART ONLINE
      </p>

      <h1 className="mt-3 max-w-[480px] text-[28px] font-extrabold leading-[1.2] tracking-[-0.03em] text-white sm:text-[34px]">
        You&rsquo;re offline
      </h1>

      <p className="mt-4 max-w-[400px] text-[15px] leading-[1.6] text-[#D5C4E2]">
        Check your internet connection and try again — your cart and saved items will still be
        here when you&rsquo;re back online.
      </p>

      <a
        href="/"
        className="mt-8 rounded-full bg-accent px-7 py-3 text-sm font-bold text-white"
      >
        Try again
      </a>
    </div>
  );
}
