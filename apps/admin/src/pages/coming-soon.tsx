export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-8 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm text-muted">Built in a later module.</p>
    </div>
  );
}
