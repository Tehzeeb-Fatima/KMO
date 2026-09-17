import { cn } from "../lib/utils";

export interface PillTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

/** The pill segmented control seen as filter tabs across both dashboards:
 *  active = filled primary/white text, inactive = white bg + border. */
export function PillTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: PillTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex rounded-full border border-border bg-surface p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              active ? "bg-primary text-white" : "text-primary hover:bg-primary-tint",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
