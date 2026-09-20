export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pending state while the confirmed action is in flight. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Shared "are you sure?" modal for every delete/remove action across all
 *  three apps — nothing destructive fires straight off a click. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[380px] rounded-xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-[16px] font-bold text-ink">
          {title}
        </h2>
        {message ? <p className="mt-2 text-[13.5px] text-muted">{message}</p> : null}
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-[9px] border border-border bg-white px-4 py-2.5 text-[13px] font-bold text-ink-dark disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-[9px] bg-danger px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
