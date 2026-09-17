export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-8 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-lg font-bold text-primary">
        404
      </span>
      <p className="mt-3 text-lg font-bold text-ink">Page not found</p>
      <p className="mt-1 text-sm text-muted">This dashboard section doesn&rsquo;t exist.</p>
    </div>
  );
}
