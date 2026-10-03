import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBanner,
  deleteBanner,
  listAllBanners,
  logAdminAction,
  updateBanner,
  uploadPromotionImage,
} from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function BannersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: banners, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => listAllBanners(supabase),
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!imageUrl) throw new Error("Upload a banner image first.");
      return createBanner(supabase, {
        image_url: imageUrl,
        title: title.trim() || null,
        link_url: linkUrl.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_active: true,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      if (user) void logAdminAction(supabase, user.id, "banner.create", "banner", created.id);
      setImageUrl(null);
      setTitle("");
      setLinkUrl("");
      setSortOrder("0");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateBanner(supabase, id, { is_active }),
    onSuccess: (_v, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      if (user) void logAdminAction(supabase, user.id, "banner.toggle", "banner", id);
    },
  });

  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string | null } | null>(
    null,
  );
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBanner(supabase, id),
    onSuccess: (_v, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      if (user) void logAdminAction(supabase, user.id, "banner.delete", "banner", id);
      setPendingDelete(null);
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex max-w-[640px] flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">Add homepage banner</p>
        <p className="text-xs text-muted">
          Banners appear as a slider at the top of the homepage, in the order below. Use an image
          of exactly 1600 × 600 px (8:3) so nothing gets cut off.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {imageUrl ? (
            <div
              className="h-[90px] w-[240px] rounded-[9px] border border-border bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : null}
          <label className="cursor-pointer rounded-lg border border-border bg-white px-4 py-2.5 text-[12.5px] font-bold text-primary">
            {uploading ? "Uploading…" : imageUrl ? "Change image" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUploading(true);
                try {
                  setImageUrl(await uploadPromotionImage(supabase, file));
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload failed.");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-ink-dark">Title (optional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Eid Sale"
              className="rounded-lg border border-border px-3 py-2.5 text-[13px] outline-none focus:border-primary-light"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-ink-dark">Link (optional)</span>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/search?promo=… or https://…"
              className="rounded-lg border border-border px-3 py-2.5 text-[13px] outline-none focus:border-primary-light"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-ink-dark">Order</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-lg border border-border px-3 py-2.5 text-[13px] outline-none focus:border-primary-light"
            />
          </label>
        </div>

        {error ? <p className="text-[12.5px] font-semibold text-danger">{error}</p> : null}

        <div>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || uploading}
            className="rounded-[7px] bg-accent px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {createMutation.isPending ? "Saving…" : "Add banner"}
          </button>
        </div>
      </div>

      <div className="flex max-w-[860px] flex-col gap-3">
        <p className="text-[15px] font-bold text-ink">Banners</p>
        {isLoading ? <p className="text-sm text-muted">Loading…</p> : null}
        {!isLoading && (banners?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
            No banners yet.
          </div>
        ) : null}
        {banners?.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4"
          >
            <div
              className="h-[70px] w-[180px] shrink-0 rounded-[8px] bg-cover bg-center"
              style={{ backgroundImage: `url(${b.image_url})` }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13.5px] font-bold text-ink-dark">
                {b.title || "Untitled banner"}
              </span>
              <span className="truncate text-[11.5px] text-muted-table">
                Order {b.sort_order}
                {b.link_url ? ` · ${b.link_url}` : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleMutation.mutate({ id: b.id, is_active: !b.is_active })}
                className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary"
              >
                {b.is_active ? "Pause" : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete({ id: b.id, title: b.title })}
                className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title || "this banner"}"?`}
        message="It will be removed from the homepage slider."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
