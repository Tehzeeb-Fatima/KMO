import { cn } from "../lib/utils";

export type StatusBadgeVariant = "success" | "warning" | "danger" | "info";

const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  success: "bg-success-tint text-success-dark",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  info: "bg-info-tint text-info",
};

/** The 4-color status pill reused across every table in both dashboards. */
export function StatusBadge({
  variant,
  children,
  className,
}: {
  variant: StatusBadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
