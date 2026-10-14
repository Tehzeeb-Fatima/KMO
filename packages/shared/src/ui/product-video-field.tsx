import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { MAX_VIDEO_MB, removeProductVideo, uploadProductVideo } from "../api/products";

/** Upload / replace / remove the one video a product can have (vendor and admin forms). */
export function ProductVideoField({
  supabase,
  productId,
  videoUrl,
  onChange,
}: {
  supabase: SupabaseClient<Database>;
  /** null until the product has been saved once. */
  productId: string | null;
  videoUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      if (videoUrl) await removeProductVideo(supabase, productId, videoUrl);
      onChange(await uploadProductVideo(supabase, productId, file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!productId || !videoUrl) return;
    setBusy(true);
    setError(null);
    try {
      await removeProductVideo(supabase, productId, videoUrl);
      onChange(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!productId) {
    return <p className="text-[12px] text-muted">Save the product first, then add a video.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {videoUrl ? (
        <video src={videoUrl} controls preload="metadata" className="max-h-[260px] w-full max-w-[360px] rounded-lg bg-black" />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-border bg-white px-4 py-2 text-[12.5px] font-bold text-primary">
          {busy ? "Uploading…" : videoUrl ? "Replace video" : "+ Add video"}
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pick(f);
            }}
          />
        </label>
        {videoUrl ? (
          <button type="button" disabled={busy} onClick={() => void remove()} className="text-[12px] font-bold text-danger">
            Remove video
          </button>
        ) : null}
        <span className="text-[11.5px] text-muted">MP4, up to {MAX_VIDEO_MB} MB. Shoppers tap to play it.</span>
      </div>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}
