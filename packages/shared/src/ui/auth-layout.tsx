import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Shared shell for every login/signup screen (customer, vendor, admin).
 * There is no auth screen in the source mockups to match pixel-for-pixel —
 * this mirrors the dashboards' own dark plum sidebar + terracotta accent
 * language instead: a branded panel on lg+ screens (same --color-sidebar-bg
 * as the admin/vendor sidebars, same stat-card accent-circle decoration),
 * paired with a plain bordered form card on the right. See
 * /design-reference/NOTES.md.
 */
export interface AuthLayoutProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Short line shown on the dark brand panel (lg+ only). */
  panelHeadline?: string;
  /** Longer supporting line under panelHeadline. */
  panelBody?: string;
  /** App-resolved logo URL/import — see DashboardShell's `logoSrc` doc. */
  logoSrc?: string;
}

export function AuthLayout({
  eyebrow = "Karachi Mart Online",
  title,
  subtitle,
  children,
  footer,
  className,
  panelHeadline = "Pakistan's local marketplace, online.",
  panelBody = "Thousands of vendors across Karachi, one storefront to manage them all.",
  logoSrc,
}: AuthLayoutProps) {
  const logo = logoSrc ? (
    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#f5ece2]">
      <img src={logoSrc} alt="Karachi Mart" className="h-full w-full object-cover" />
    </span>
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
      KM
    </span>
  );
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Brand panel — hidden below lg, matches the admin/vendor sidebar palette */}
      <div className="relative hidden w-[42%] max-w-[520px] flex-col justify-between overflow-hidden bg-sidebar-bg px-12 py-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-accent/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-accent/10"
        />

        <div className="relative flex items-center gap-2.5">
          {logo}
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
            {eyebrow}
          </span>
        </div>

        <div className="relative flex flex-col gap-3">
          <h2 className="max-w-[22ch] text-3xl font-bold leading-tight tracking-tight">
            {panelHeadline}
          </h2>
          <p className="max-w-[34ch] text-sm leading-relaxed text-white/70">{panelBody}</p>
        </div>

        <p className="relative font-mono text-[11px] text-white/40">
          © {new Date().getFullYear()} Karachi Mart Online
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className={cn("w-full max-w-[420px]", className)}>
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            {logo}
            <p className="mt-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              {eyebrow}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-7 sm:p-9">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}

            <div className="mt-6">{children}</div>
          </div>

          {footer ? (
            <p className="mt-6 text-center text-sm text-muted">{footer}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
