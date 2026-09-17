"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listCartItems, listCategories } from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";

export function SiteHeader() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [query, setQuery] = useState("");

  const { data: cartItems } = useQuery({
    queryKey: ["cart"],
    queryFn: () => listCartItems(supabase),
    enabled: !!user,
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });

  const cartCount = cartItems?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
  }

  return (
    <header>
      {/* row 1 — logo / search / deliver-to / sign in / cart */}
      <div className="flex items-center gap-4 bg-surface px-4 py-[18px] sm:gap-7 sm:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-[11px]">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] bg-primary text-[15px] font-extrabold tracking-[-0.03em] text-white">
            KM
          </span>
          <span className="hidden leading-[1.05] sm:block">
            <span className="block text-[17px] font-extrabold tracking-[-0.028em] text-ink-dark">
              Karachi Mart
            </span>
            <span className="block font-mono text-[9px] tracking-[0.22em] text-accent">
              ONLINE
            </span>
          </span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="hidden max-w-[640px] flex-1 items-center gap-3 rounded-full border border-border bg-surface-alt py-[5px] pl-[18px] pr-[5px] sm:flex"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands and vendors"
            className="flex-1 truncate bg-transparent text-sm text-ink outline-none placeholder:text-muted-table"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-accent px-6 py-2.5 text-[13px] font-bold text-white"
          >
            Search
          </button>
        </form>

        <div className="flex flex-1 items-center justify-end gap-[26px]">
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <span className="h-[7px] w-[7px] rounded-full bg-accent" />
            <span className="leading-[1.25]">
              <span className="block text-[10.5px] text-muted-table">Deliver to</span>
              <span className="block text-[13px] font-bold text-ink-dark">Karachi</span>
            </span>
          </div>

          <Link
            href={user ? "/account" : "/login"}
            className="shrink-0 text-[13.5px] font-semibold text-primary"
          >
            {user ? (profile?.full_name?.split(" ")[0] ?? "Account") : "Sign in"}
          </Link>

          <Link href="/cart" className="relative shrink-0 pr-1 text-[13.5px] font-bold text-primary">
            Cart
            {cartCount > 0 ? (
              <span className="absolute -right-2.5 -top-2 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-surface px-4 pb-2 md:hidden">
        <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-accent" />
        <span className="text-[11.5px] text-muted-table">
          Deliver to <span className="font-bold text-ink-dark">Karachi</span>
        </span>
      </div>

      <form onSubmit={handleSearch} className="bg-surface px-4 pb-3 sm:hidden">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface-alt py-1 pl-4 pr-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products and vendors"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-table"
          />
          <button type="submit" className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-white">
            Go
          </button>
        </div>
      </form>

      {/* row 2 — terracotta category strip */}
      {categories && categories.length > 0 ? (
        <div className="flex gap-0.5 overflow-x-auto bg-accent px-4 sm:px-10">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/search?category=${c.id}`}
              className="shrink-0 whitespace-nowrap border-b-[3px] border-transparent px-[15px] py-[13px] text-[12.5px] font-semibold text-[#F8E4DA] hover:text-white"
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
