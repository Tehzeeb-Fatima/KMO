import { NavLink, Outlet, useLocation } from "react-router-dom";
import { DashboardShell } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { ADMIN_NAV_ITEMS } from "../dashboard-nav";
import kmoIcon from "../assets/kmo-icon.png";

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Overview", subtitle: "Platform-wide performance" },
  "/vendors": { title: "Vendors", subtitle: "Manage vendor accounts" },
  "/orders": { title: "Orders", subtitle: "All orders across vendors" },
  "/products": { title: "Products", subtitle: "Catalogue moderation" },
  "/customers": { title: "Customers", subtitle: "Registered shoppers" },
  "/payouts": { title: "Payouts", subtitle: "Vendor payouts and commission" },
  "/categories": { title: "Categories", subtitle: "Storefront category tree" },
  "/returns": { title: "Returns", subtitle: "Review return requests" },
  "/reviews": { title: "Reviews", subtitle: "Review moderation" },
  "/contact-messages": { title: "Contact requests", subtitle: "Messages from the contact form" },
  "/audit-log": { title: "Audit log", subtitle: "Recent admin actions" },
  "/settings": { title: "Settings", subtitle: "Platform configuration" },
};

export function DashboardLayout() {
  const { profile } = useAuth();
  const location = useLocation();
  const activeItem =
    ADMIN_NAV_ITEMS.find((item) =>
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to),
    ) ?? ADMIN_NAV_ITEMS[0];
  const meta = TITLES[location.pathname] ?? { title: activeItem.label };

  const initials = (profile?.full_name ?? "A")
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DashboardShell
      logoSrc={kmoIcon}
      navItems={ADMIN_NAV_ITEMS}
      activeKey={activeItem.key}
      title={meta.title}
      subtitle={meta.subtitle}
      avatarInitials={initials || "A"}
      LinkComponent={NavLink}
    >
      <Outlet />
    </DashboardShell>
  );
}
