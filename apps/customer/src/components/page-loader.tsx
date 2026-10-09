/**
 * Loading states without "Loading…" text: a brand-coloured spinner for
 * small waits, and shimmer skeletons shaped like the page that is coming.
 */

const block = "animate-pulse rounded-lg bg-surface-alt";

/** Centered spinner; screen readers still hear "Loading". */
export function PageLoader({ className = "min-h-[50vh]" }: { className?: string }) {
  return (
    <div role="status" className={`flex flex-1 items-center justify-center p-10 ${className}`}>
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Stack of rows, for account lists (orders, addresses, wishlist…). */
export function ListSkeleton({ rows = 3, rowClassName = "h-20" }: { rows?: number; rowClassName?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${block} ${rowClassName}`} />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Product page: gallery, details and buy box. */
export function ProductPageSkeleton() {
  return (
    <div role="status" className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <div className={`${block} mb-5 h-4 w-60`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[500px_minmax(0,1fr)_316px] lg:items-start lg:gap-[26px]">
        <div className="flex flex-col gap-3">
          <div className={`${block} aspect-square w-full`} />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${block} aspect-square`} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className={`${block} h-4 w-28`} />
          <div className={`${block} h-8 w-11/12`} />
          <div className={`${block} h-8 w-2/3`} />
          <div className={`${block} mt-2 h-9 w-40`} />
          <div className={`${block} mt-4 h-4 w-full`} />
          <div className={`${block} h-4 w-full`} />
          <div className={`${block} h-4 w-4/5`} />
          <div className="mt-4 flex gap-3">
            <div className={`${block} h-12 flex-1 rounded-full`} />
            <div className={`${block} h-12 flex-1 rounded-full`} />
          </div>
        </div>
        <div className={`${block} h-64 rounded-xl`} />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Store page: banner, store header and a product grid. */
export function StorePageSkeleton() {
  return (
    <div role="status" className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <div className={`${block} h-36 w-full rounded-xl sm:h-48`} />
      <div className="mt-4 flex items-center gap-4">
        <div className={`${block} h-16 w-16 rounded-[14px]`} />
        <div className="flex flex-1 flex-col gap-2">
          <div className={`${block} h-6 w-48`} />
          <div className={`${block} h-4 w-32`} />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`${block} h-64`} />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Cart: item rows and the order summary. */
export function CartSkeleton() {
  return (
    <div role="status" className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <div className={`${block} mb-5 h-8 w-40`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${block} h-28`} />
          ))}
        </div>
        <div className={`${block} h-60 rounded-xl`} />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
