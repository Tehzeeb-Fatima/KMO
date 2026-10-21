import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Shared Button, styled from the KMO design tokens (see ../theme/tokens.css).
 * Matches the mockups' flat, bordered-card aesthetic: filled terracotta
 * primary CTA, plum outline secondary, pill radius, no shadow.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 text-center leading-tight font-sans font-semibold transition-colors cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-light rounded-full",
        secondary:
          "bg-white text-primary border border-primary rounded-full hover:bg-primary-tint",
        ghost: "bg-transparent text-primary hover:bg-primary-tint rounded-md",
      },
      size: {
        sm: "min-h-8 px-3 py-1 text-sm",
        md: "min-h-10 px-5 py-1.5 text-sm",
        lg: "min-h-12 px-5 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
