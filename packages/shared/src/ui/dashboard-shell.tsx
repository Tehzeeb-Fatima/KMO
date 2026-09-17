import * as React from "react";
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
  brand = "KM",
  navItems,
  activeKey,
  title,
  subtitle,
  avatarLabel,
  avatarInitials,
  LinkComponent = DefaultLink,
  children,
}: {
  brand?: string;
  navItems: DashboardNavItem[];
  activeKey: string;
  title: string;
  subtitle?: string;
  avatarLabel?: string;
  avatarInitials: string;
  LinkComponent?: React.ComponentType<DashboardLinkProps>;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-bg">
      <aside
        className={cn(
          "flex shrink-0 flex-col bg-sidebar text-white transition-[width]",
          collapsed ? "w-[68px]" : "w-[232px]",
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            {brand}
          </span>
          {!collapsed && (
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
              Karachi Mart
            </span>
          )}
        </div>

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

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mx-3 mb-4 rounded-lg px-3 py-2 text-left text-xs font-medium text-sidebar-muted hover:bg-sidebar-primary/40"
        >
          {collapsed ? "→" : "← Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-[18px]">
          <div>
            <h1 className="text-[19px] font-extrabold tracking-[-0.025em] text-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[12.5px] text-muted">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {avatarLabel ? (
              <span className="text-sm text-muted">{avatarLabel}</span>
            ) : null}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {avatarInitials}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
