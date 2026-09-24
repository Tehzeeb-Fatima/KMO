import * as React from "react";
import { RotateCcw, Video } from "lucide-react";
import {
  MAX_360_FRAMES,
  MIN_360_FRAMES,
  PRODUCT_360_ANGLES,
  RECOMMENDED_360_FRAMES,
} from "../api/products";
import { extractVideoFrames } from "../lib/extract-video-frames";
import { cn } from "../lib/utils";

/** Frames pulled from a clip — enough for a smooth spin without a huge upload. */
const FRAMES_FROM_VIDEO = 32;

export interface Product360Frame {
  angleIndex: number;
  url: string;
}

export interface Product360ColourSet {
  /** null = the spin used for every colour. */
  variantId: string | null;
  label: string;
}

export interface Product360UploaderProps {
  /** Frames of the colour set currently being edited, in rotation order. */
  frames: Product360Frame[];
  /** Colour sets the vendor can switch between ("All colours" + each colour). */
  sets: Product360ColourSet[];
  activeSetId: string | null;
  onSelectSet: (variantId: string | null) => void;
  /** Frame counts per set, so the picker can show progress at a glance. */
  frameCounts: Record<string, number>;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** Photos are appended to the end of the current set, in the order picked. */
  onAddFrames: (files: File[]) => void;
  onRemoveFrame: (angleIndex: number) => void;
  onClearSet: () => void;
  uploading?: boolean;
  /** Shown instead of the uploader when the product hasn't been saved yet. */
  disabledReason?: string;
  error?: string | null;
}

const SET_KEY_DEFAULT = "__default__";

function setKey(variantId: string | null) {
  return variantId ?? SET_KEY_DEFAULT;
}

/**
 * Optional 360° spin uploader, shared by the vendor and admin product forms.
 * Purely presentational — each app wires its own upload mutations, same as the
 * normal image uploader.
 */
export function Product360Uploader({
  frames,
  sets,
  activeSetId,
  onSelectSet,
  frameCounts,
  enabled,
  onToggle,
  onAddFrames,
  onRemoveFrame,
  onClearSet,
  uploading,
  disabledReason,
  error,
}: Product360UploaderProps) {
  const [open, setOpen] = React.useState(enabled);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const [videoStatus, setVideoStatus] = React.useState<string | null>(null);
  const [videoError, setVideoError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (enabled) setOpen(true);
  }, [enabled]);

  const count = frames.length;
  const remaining = MAX_360_FRAMES - count;

  async function handleVideo(file: File) {
    setVideoError(null);
    setVideoStatus("Reading video…");
    try {
      const wanted = Math.min(FRAMES_FROM_VIDEO, remaining);
      const extracted = await extractVideoFrames(file, {
        frameCount: wanted,
        onProgress: (done, total) => setVideoStatus(`Making frame ${done} of ${total}…`),
      });
      setVideoStatus(null);
      onAddFrames(extracted);
    } catch (err) {
      setVideoStatus(null);
      setVideoError(err instanceof Error ? err.message : "Couldn't read that video.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-fit items-center gap-2 rounded-lg border-[1.5px] border-dashed border-border px-4 py-2.5 text-[13px] font-semibold text-primary hover:border-primary-light"
      >
        <RotateCcw className="h-4 w-4" />
        Add 360° Product View
        <span className="font-normal text-muted-table">(optional)</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface-alt p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-[14px] font-bold text-ink">
            <RotateCcw className="h-4 w-4 text-accent" />
            360° Product View
          </span>
          <span className="text-[12px] text-muted">
            Photograph the product from all sides and upload the photos in order.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Enable 360° product view"
          onClick={() => onToggle(!enabled)}
          className="mt-1 flex h-[23px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors"
          style={{
            background: enabled ? "var(--color-accent)" : "var(--color-border)",
            justifyContent: enabled ? "flex-end" : "flex-start",
          }}
        >
          <span className="h-[19px] w-[19px] rounded-full bg-white" />
        </button>
      </div>

      <p className="rounded-lg bg-white px-3.5 py-2.5 text-[11.5px] leading-[1.6] text-muted">
        <span className="font-bold text-ink-dark">Easiest way — record a video.</span> Put the
        product on a stool or turntable and take a steady {5}–{10} second clip all the way
        around it. We&rsquo;ll cut the clip into {FRAMES_FROM_VIDEO} frames for you. A smooth,
        even pan gives a far better spin than {RECOMMENDED_360_FRAMES} photos taken by hand —
        and it&rsquo;s one upload instead of {RECOMMENDED_360_FRAMES}.
      </p>

      {disabledReason ? (
        <p className="text-[12.5px] text-muted">{disabledReason}</p>
      ) : (
        <>
          {sets.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold text-ink-dark">
                Which colour is this spin for?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sets.map((s) => {
                  const active = setKey(s.variantId) === setKey(activeSetId);
                  const n = frameCounts[setKey(s.variantId)] ?? 0;
                  return (
                    <button
                      key={setKey(s.variantId)}
                      type="button"
                      onClick={() => onSelectSet(s.variantId)}
                      className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
                      style={
                        active
                          ? { background: "var(--color-primary)", color: "#fff" }
                          : {
                              background: "#fff",
                              border: "1px solid var(--color-border)",
                              color: "var(--color-primary)",
                            }
                      }
                    >
                      {s.label}
                      <span className={cn("ml-1.5", active ? "text-white/70" : "text-muted-table")}>
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] text-muted">
                &ldquo;All colours&rdquo; is the fallback spin. Add a spin for a specific colour
                and the storefront swaps to it when a shopper picks that colour.
              </span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={uploading || !!videoStatus || remaining <= 0}
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
            >
              <Video className="h-3.5 w-3.5" />
              {videoStatus ?? "Upload a video"}
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleVideo(file);
                e.target.value = "";
              }}
            />

            <span className="text-[11.5px] text-muted-table">or</span>

            <button
              type="button"
              disabled={uploading || !!videoStatus || remaining <= 0}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-border bg-white px-4 py-2 text-[12.5px] font-bold text-primary disabled:opacity-60"
            >
              {uploading
                ? "Uploading…"
                : count === 0
                  ? "Upload photos"
                  : `Add more photos (${remaining} left)`}
            </button>
            {count > 0 ? (
              <button
                type="button"
                disabled={uploading}
                onClick={onClearSet}
                className="rounded-lg border border-border bg-white px-3 py-2 text-[12px] font-bold text-danger disabled:opacity-60"
              >
                Remove all
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) onAddFrames(files.slice(0, remaining));
                e.target.value = "";
              }}
            />
          </div>

          {videoStatus ? (
            <p className="text-[11.5px] text-muted">
              Cutting your clip into frames — this happens in your browser, so nothing is
              uploaded until it finishes.
            </p>
          ) : null}
          {videoError ? (
            <p className="text-[12px] font-semibold text-danger">{videoError}</p>
          ) : null}

          {count > 0 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {frames.map((frame) => {
                const angle = PRODUCT_360_ANGLES.find((a) => a.index === frame.angleIndex);
                return (
                  <div key={frame.angleIndex} className="flex flex-col gap-1">
                    <div className="relative">
                      <div
                        className="aspect-square w-full rounded-[7px] border border-border bg-white bg-cover bg-center"
                        style={{ backgroundImage: `url(${frame.url})` }}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveFrame(frame.angleIndex)}
                        aria-label={`Remove frame ${frame.angleIndex}`}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
                      >
                        ×
                      </button>
                    </div>
                    <span className="truncate text-center text-[9.5px] text-muted">
                      {frame.angleIndex}
                      {angle ? ` · ${angle.label}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex items-center justify-between text-[12px]">
            <span
              className={cn(
                count >= RECOMMENDED_360_FRAMES
                  ? "text-success"
                  : count >= MIN_360_FRAMES
                    ? "text-muted"
                    : "text-muted",
              )}
            >
              {count} photo{count === 1 ? "" : "s"}
              {count >= RECOMMENDED_360_FRAMES
                ? " — smooth spin"
                : count >= MIN_360_FRAMES
                  ? ` — works, ${RECOMMENDED_360_FRAMES}+ is smoother`
                  : ""}
            </span>
            {enabled && count > 0 && count < MIN_360_FRAMES ? (
              <span className="font-semibold text-warning">
                At least {MIN_360_FRAMES} needed
              </span>
            ) : null}
          </div>
        </>
      )}

      {error ? <p className="text-[12.5px] font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
