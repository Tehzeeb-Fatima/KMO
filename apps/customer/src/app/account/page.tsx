"use client";

import Link from "next/link";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";

export default function AccountPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <AccountContent />
    </RequireAuth>
  );
}

const LINKS = [
  { href: "/account/orders", label: "Your orders", sub: "Track orders and request returns" },
  { href: "/account/wishlist", label: "Wishlist", sub: "Products you've saved" },
  { href: "/account/addresses", label: "Addresses", sub: "Manage delivery addresses" },
  { href: "/account/messages", label: "Messages", sub: "Chat with the stores you've contacted" },
];

function AccountContent() {
  const { profile, signOut } = useAuth();

  return (
    <main className="mx-auto w-full max-w-[600px] px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Your account</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">
        Welcome, {profile?.full_name ?? "there"}
      </h1>

      <div className="mt-6 flex flex-col gap-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-border bg-surface p-4 hover:border-primary-light"
          >
            <p className="text-sm font-bold text-ink-dark">{link.label}</p>
            <p className="text-xs text-muted">{link.sub}</p>
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-6 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary"
      >
        Sign out
      </button>
    </main>
  );
}
