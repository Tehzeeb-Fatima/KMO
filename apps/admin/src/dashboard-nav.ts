import type { DashboardNavItem } from "@kmo/shared/ui";

export const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { key: "overview", label: "Overview", to: "/" },
  { key: "vendors", label: "Vendors", to: "/vendors" },
  { key: "orders", label: "Orders", to: "/orders" },
  { key: "products", label: "Products", to: "/products" },
  { key: "customers", label: "Customers", to: "/customers" },
  { key: "payouts", label: "Payouts", to: "/payouts" },
  { key: "categories", label: "Categories", to: "/categories" },
  { key: "returns", label: "Returns", to: "/returns" },
  { key: "reviews", label: "Reviews", to: "/reviews" },
  { key: "contact", label: "Contact requests", to: "/contact-messages" },
  { key: "audit-log", label: "Audit log", to: "/audit-log" },
  { key: "settings", label: "Settings", to: "/settings" },
];
