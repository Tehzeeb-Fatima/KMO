import type { DashboardNavItem } from "@kmo/shared/ui";
import type { Profile } from "@kmo/shared/auth";

export const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { key: "overview", label: "Overview", to: "/" },
  { key: "vendors", label: "Vendors", to: "/vendors" },
  { key: "orders", label: "Orders", to: "/orders" },
  { key: "products", label: "Products", to: "/products" },
  { key: "customers", label: "Customers", to: "/customers" },
  { key: "users", label: "Users & roles", to: "/users" },
  { key: "payouts", label: "Payouts", to: "/payouts" },
  { key: "categories", label: "Categories", to: "/categories" },
  { key: "couriers", label: "Couriers", to: "/couriers" },
  { key: "promotions", label: "Promotions", to: "/promotions" },
  { key: "banners", label: "Banners", to: "/banners" },
  { key: "testimonials", label: "Testimonials", to: "/testimonials" },
  { key: "returns", label: "Returns", to: "/returns" },
  { key: "reviews", label: "Reviews", to: "/reviews" },
  { key: "contact", label: "Contact requests", to: "/contact-messages" },
  { key: "audit-log", label: "Audit log", to: "/audit-log" },
  { key: "settings", label: "Settings", to: "/settings" },
];

/** Modules every staff user can open, whatever the admin granted. */
const STAFF_BASE_MODULES = ["overview"];

/** Whether the signed-in profile may open a dashboard module. Admins open everything. */
export function canAccessModule(profile: Profile | null | undefined, moduleKey: string): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  if (profile.role !== "staff") return false;
  return STAFF_BASE_MODULES.includes(moduleKey) || profile.admin_modules.includes(moduleKey);
}

export function visibleNavItems(profile: Profile | null | undefined): DashboardNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => canAccessModule(profile, item.key));
}