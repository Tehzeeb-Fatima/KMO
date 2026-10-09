"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listFollowedVendors, unfollowVendor } from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { ListSkeleton } from "@/components/page-loader";

export default function FollowingPage() {
  return (
    <RequireAuth allowedRoles={["customer"]}>
      <FollowingContent />
    </RequireAuth>
  );
}

function FollowingContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["followed-vendors", user?.id],
    queryFn: () => listFollowedVendors(supabase, user!.id),
    enabled: !!user,
  });

  const [pendingUnfollowId, setPendingUnfollowId] = useState<string | null>(null);
  const unfollowMutation = useMutation({
    mutationFn: (vendorId: string) => unfollowVendor(supabase, user!.id, vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followed-vendors"] });
      queryClient.invalidateQueries({ queryKey: ["is-following-vendor"] });
      setPendingUnfollowId(null);
    },
  });

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
        {t.account.followedStoresTitle}
      </h1>

      {isLoading ? (
        <ListSkeleton rows={3} rowClassName="h-16" />
      ) : !vendors || vendors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          {t.account.noFollowedHint}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white bg-cover bg-center"
                style={v.logo_url ? { backgroundImage: `url(${v.logo_url})` } : undefined}
              >
                {!v.logo_url && v.store_name.charAt(0)}
              </span>
              <Link href={`/store/${v.slug}`} className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink-dark">{v.store_name}</p>
                <p className="truncate text-xs text-muted">{v.area || t.header.city}</p>
              </Link>
              <button
                type="button"
                onClick={() => setPendingUnfollowId(v.id)}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-danger"
              >
                {t.account.unfollow}
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingUnfollowId}
        title={t.account.unfollowTitle}
        confirmLabel={t.account.unfollow}
        loading={unfollowMutation.isPending}
        onConfirm={() => unfollowMutation.mutate(pendingUnfollowId!)}
        onCancel={() => setPendingUnfollowId(null)}
      />
    </div>
  );
}
