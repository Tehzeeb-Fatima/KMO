import * as React from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { cn } from "../lib/utils";

export interface DashboardNavItem {
  key: string;
  label: string;
  to: string;
}

export interface DashboardLinkProps {
  to: string;
  className?: string;
  children?: React.ReactNode;
}

const DefaultLink = ({ to, className, children }: DashboardLinkProps) => (
  <a href={to} className={className}>
    {children}
  </a>
);

/**
 * The dark-plum sidebar + white topbar app shell shared by the vendor and
 * admin dashboards (identical styling in both source mockups — see
 * /design-reference/NOTES.md). Router-agnostic: pass your router's Link
 * component (e.g. react-router-dom's NavLink) as `LinkComponent`.
 */
export function DashboardShell({
  brand = "Karachi Mart",
  logoSrc,
  navItems,
  activeKey,
  title,
  subtitle,
  avatarLabel,
  avatarInitials,
  onSignOut,
  headerRight,
  homeUrl,
  LinkComponent = DefaultLink,
  children,
}: {
  brand?: string;
  /** App-resolved logo URL/import (each bundler handles static image imports
   *  differently, so the shared component takes the resolved string rather
   *  than importing the asset itself). Falls back to a text badge if omitted. */
  logoSrc?: string;
  navItems: DashboardNavItem[];
  activeKey: string;
  title: string;
  subtitle?: string;
  avatarLabel?: string;
  avatarInitials: string;
  /** Shows a "Sign out" option under the avatar when provided. */
  onSignOut?: () => void;
  /** Rendered in the header, just before the avatar (e.g. a notification bell). */
  headerRight?: React.ReactNode;
  /** Where the sidebar logo/brand goes when clicked — the main storefront. */
  homeUrl?: string;
  LinkComponent?: React.ComponentType<DashboardLinkProps>;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-bg">
      <aside
        className={cn(
          "flex shrink-0 flex-col bg-sidebar text-white transition-[width]",
          collapsed ? "w-[68px]" : "w-[232px]",
        )}
      >
        <a
          href={homeUrl ?? "/"}
          title="Go to the storefront"
          className="flex items-center gap-2 px-5 py-5 hover:opacity-85"
        >
          {logoSrc ? (
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#f5ece2]">
              <img src={logoSrc} alt={brand} className="h-full w-full object-cover" />
            </span>
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              {brand.slice(0, 2).toUpperCase()}
            </span>
          )}
          {!collapsed && (
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
              Karachi Mart
            </span>
          )}
        </a>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <LinkComponent
                key={item.key}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-sidebar-primary/60",
                  active && "bg-sidebar-primary text-white",
                  collapsed && "justify-center px-0",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    active ? "bg-accent text-white" : "bg-sidebar-accent text-white/80",
                  )}
                >
                  {item.label.charAt(0)}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </LinkComponent>
            );
          })}
        </nav>

        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            className={cn(
              "mx-3 mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-sidebar-primary/60",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {!collapsed && <span>Sign out</span>}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mx-3 mb-4 mt-1 rounded-lg px-3 py-2 text-left text-xs font-medium text-sidebar-muted hover:bg-sidebar-primary/40"
        >
          {collapsed ? "→" : "← Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-20 flex items-center justify-between border-b border-border bg-surface px-8 py-[18px]">
          <div>
            <h1 className="text-[19px] font-extrabold tracking-[-0.025em] text-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[12.5px] text-muted">{subtitle}</p>
            ) : null}
          </div>
          <div className="relative flex items-center gap-3" ref={menuRef}>
            {avatarLabel ? (
              <span className="text-sm text-muted">{avatarLabel}</span>
            ) : null}
            {headerRight}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2 transition-colors hover:bg-surface-alt"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {avatarInitials}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={2.5} />
            </button>
            {menuOpen && onSignOut ? (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-danger hover:bg-surface-alt"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
