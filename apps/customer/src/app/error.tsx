"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-tint text-2xl font-bold text-danger">
        !
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-ink">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        We hit an unexpected error loading this page. Try again, or head back home.
      </p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-primary px-6 py-3 text-sm font-bold text-primary"
        >
          Try again
        </button>
        <a href="/" className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-white">
          Back to home
        </a>
      </div>
    </main>
  );
}
