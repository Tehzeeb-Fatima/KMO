"use client";

import Link from "next/link";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { useLanguage } from "@/lib/i18n/language-context";
import type { TranslationTree } from "@/lib/i18n/translations";

export default function AccountPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <AccountContent />
    </RequireAuth>
  );
}

function links(t: TranslationTree) {
  return [
    { href: "/account/orders", label: t.account.yourOrders, sub: t.account.yourOrdersSub },
    { href: "/account/wishlist", label: t.account.wishlist, sub: t.account.wishlistSub },
    { href: "/account/following", label: t.account.followedStores, sub: t.account.followedStoresSub },
    { href: "/account/addresses", label: t.account.addresses, sub: t.account.addressesSub },
    { href: "/account/messages", label: t.account.messages, sub: t.account.messagesSub },
  ];
}

function AccountContent() {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <main className="mx-auto w-full max-w-[600px] px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{t.account.yourAccount}</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">
        {t.account.welcome} {profile?.full_name ?? t.account.there}
      </h1>

      <div className="mt-6 flex flex-col gap-3">
        {links(t).map((link) => (
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
        {t.account.signOut}
      </button>
    </main>
  );
}
