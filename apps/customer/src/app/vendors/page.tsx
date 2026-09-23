"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listVendors } from "@kmo/shared/api";
import { Breadcrumbs } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";

export default function VendorsPage() {
  const [search, setSearch] = useState("");

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["all-vendors", search],
    queryFn: () => listVendors(supabase, { status: "approved", search: search || undefined }),
  });

  return (
    <div className="mx-auto w-full max-w-[1358px] px-4 py-6 sm:px-6 lg:px-10">
      <Breadcrumbs
        LinkComponent={Link}
        className="mb-2"
        items={[{ label: "Home", href: "/" }, { label: "Vendors" }]}
      />
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em] text-ink sm:text-[26px]">
        All vendors
      </h1>
      <p className="mt-1 text-[13.5px] text-muted">
        Browse every verified Karachi shop selling on Karachi Mart.
      </p>

      <input
        type="text"
        placeholder="Search vendors by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-5 w-full max-w-[400px] rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[13.5px] outline-none focus:border-primary-light"
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[190px] animate-pulse rounded-lg bg-surface-alt" />
            ))}
          </div>
        ) : !vendors || vendors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
            No vendors found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {vendors.map((v) => (
              <Link
                key={v.id}
                href={`/store/${v.slug}`}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <div
                  className="h-[76px] bg-surface-alt bg-cover bg-center"
                  style={v.cover_url ? { backgroundImage: `url(${v.cover_url})` } : undefined}
                />
                <div className="-mt-[34px] flex flex-col gap-2.5 p-4">
                  <span
                    className="flex h-[50px] w-[50px] items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white ring-[3px] ring-white bg-cover bg-center"
                    style={
                      v.logo_url
                        ? { backgroundImage: `url(${v.logo_url})` }
                        : undefined
                    }
                  >
                    {!v.logo_url && v.store_name.charAt(0)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[15.5px] font-bold tracking-[-0.015em] text-ink-dark">
                      {v.store_name}
                    </span>
                    <span className="rounded bg-danger-tint px-[5px] py-[3px] font-mono text-[9px] tracking-[0.05em] text-danger">
                      VERIFIED
                    </span>
                  </div>
                  {v.description ? (
                    <p className="line-clamp-2 text-[13px] leading-[1.55] text-muted">
                      {v.description}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between border-t border-[#F1EAE6] pt-[11px] text-[12.5px]">
                    <span className="text-muted">{v.area || "Karachi"}</span>
                    <span className="font-bold text-primary">Visit →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
