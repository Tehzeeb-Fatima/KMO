import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  endAdornment?: React.ReactNode;
}

/** Matches the bordered form-field convention used throughout the mockups:
 *  border:1px solid #EADFDA; border-radius:8px; padding:11px 13px; font-size:13.5px. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, endAdornment, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-[13px] font-semibold text-ink-secondary"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-[13.5px] text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-primary-light",
              endAdornment && "pr-10",
              error && "border-danger",
              className,
            )}
            {...props}
          />
          {endAdornment ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {endAdornment}
            </div>
          ) : null}
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";
