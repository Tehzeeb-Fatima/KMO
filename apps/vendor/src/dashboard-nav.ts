import type { DashboardNavItem } from "@kmo/shared/ui";

export const VENDOR_NAV_ITEMS: DashboardNavItem[] = [
  { key: "overview", label: "Overview", to: "/" },
  { key: "profile", label: "My profile", to: "/profile" },
  { key: "products", label: "Products", to: "/products" },
  { key: "orders", label: "Orders", to: "/orders" },
  { key: "payments", label: "Payments", to: "/payments" },
  { key: "coupons", label: "Coupons", to: "/coupons" },
  { key: "shipping", label: "Shipping", to: "/shipping" },
  { key: "sales-report", label: "Sales report", to: "/sales-report" },
  { key: "settings", label: "Store settings", to: "/settings" },
  { key: "reviews", label: "Reviews & Q&A", to: "/reviews" },
  { key: "messages", label: "Messages", to: "/messages" },
];
