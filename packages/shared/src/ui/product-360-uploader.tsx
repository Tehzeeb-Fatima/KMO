import * as React from "react";
import { RotateCcw } from "lucide-react";
import { PRODUCT_360_ANGLES } from "../api/products";
import { cn } from "../lib/utils";

export interface Product360UploaderProps {
  /** Angle index (1-8) → image url, for angles already uploaded. */
  images: Record<number, string>;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onUpload: (angleIndex: number, file: File) => void;
  onRemove: (angleIndex: number) => void;
  /** Angle currently uploading, so its slot can show a spinner. */
  uploadingAngle?: number | null;
  /** Shown instead of the slots when the product hasn't been saved yet. */
  disabledReason?: string;
  error?: string | null;
}

/**
 * Optional 360° view uploader: eight numbered slots, one per angle, shared by
 * the vendor and admin product forms. Purely presentational — each app wires
 * its own upload/remove mutations, same as the normal image uploader.
 */
export function Product360Uploader({
  images,
  enabled,
  onToggle,
  onUpload,
  onRemove,
  uploadingAngle,
  disabledReason,
  error,
}: Product360UploaderProps) {
  const [open, setOpen] = React.useState(enabled);
  const uploadedCount = PRODUCT_360_ANGLES.filter((a) => images[a.index]).length;

  React.useEffect(() => {
    if (enabled) setOpen(true);
  }, [enabled]);

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
            Take 8 photos of your product from different angles and upload them in order.
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
        <span className="font-bold text-ink-dark">Tip:</span> keep the product in the same
        position and take 8 photos while moving around it. Keep the lighting, background and
        distance the same in every photo — no special camera needed.
      </p>

      {disabledReason ? (
        <p className="text-[12.5px] text-muted">{disabledReason}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PRODUCT_360_ANGLES.map((angle) => (
              <AngleSlot
                key={angle.index}
                index={angle.index}
                label={angle.label}
                url={images[angle.index]}
                uploading={uploadingAngle === angle.index}
                onUpload={(file) => onUpload(angle.index, file)}
                onRemove={() => onRemove(angle.index)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-[12px]">
            <span className={cn(uploadedCount === 8 ? "text-success" : "text-muted")}>
              {uploadedCount} of 8 angles uploaded
            </span>
            {enabled && uploadedCount < 8 ? (
              <span className="font-semibold text-warning">All 8 needed to save</span>
            ) : null}
          </div>
        </>
      )}

      {error ? <p className="text-[12.5px] font-semibold text-danger">{error}</p> : null}
    </div>
  );
}

function AngleSlot({
  index,
  label,
  url,
  uploading,
  onUpload,
  onRemove,
}: {
  index: number;
  label: string;
  url?: string;
  uploading?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // Let the same file be picked again after a remove.
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex aspect-square w-full items-center justify-center overflow-hidden rounded-[9px] border-[1.5px] bg-white bg-cover bg-center text-[11px] text-muted-table disabled:opacity-60",
            url ? "border-solid border-border" : "border-dashed border-border",
          )}
          style={url ? { backgroundImage: `url(${url})` } : undefined}
        >
          {uploading ? "Uploading…" : url ? null : `+ Angle ${index}`}
        </button>
        {url && !uploading ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label} photo`}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
          >
            ×
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      <span className="text-center text-[10.5px] font-semibold text-muted">
        {index}. {label}
      </span>
    </div>
  );
}
