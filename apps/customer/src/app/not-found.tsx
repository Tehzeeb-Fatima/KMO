import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint text-2xl font-bold text-primary">
        404
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-ink">
        This page wandered off somewhere in Karachi
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link href="/" className="mt-5 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white">
        Back to home
      </Link>
    </main>
  );
}
