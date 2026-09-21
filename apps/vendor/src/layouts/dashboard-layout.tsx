import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell, NotificationBell, type NotificationItem } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@kmo/shared/api";
import { VENDOR_NAV_ITEMS } from "../dashboard-nav";
import kmoIcon from "../assets/kmo-icon.png";
import { supabase } from "../lib/supabase";

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Overview", subtitle: "Your store at a glance" },
  "/profile": { title: "My profile", subtitle: "Your account details" },
  "/products": { title: "Products", subtitle: "Manage your catalogue" },
  "/orders": { title: "Orders", subtitle: "Manage incoming orders" },
  "/payments": { title: "Payments", subtitle: "Payouts and commission" },
  "/coupons": { title: "Coupons", subtitle: "Discounts for your store" },
  "/shipping": { title: "Shipping", subtitle: "Couriers and invoices" },
  "/sales-report": { title: "Sales report", subtitle: "Revenue by period" },
  "/settings": { title: "Store settings", subtitle: "Banner, logo, hours and policies" },
  "/reviews": { title: "Reviews & Q&A", subtitle: "Customer feedback inbox" },
  "/messages": { title: "Messages", subtitle: "Chat with your customers" },
};

function HeaderNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: items } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listMyNotifications(supabase),
    refetchInterval: 20000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(supabase, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(supabase),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const list: NotificationItem[] = items ?? [];
  const unreadCount = list.filter((n) => !n.read_at).length;

  return (
    <NotificationBell
      items={list}
      unreadCount={unreadCount}
      onMarkAllRead={() => markAllMutation.mutate()}
      onItemClick={(n) => {
        if (!n.read_at) markReadMutation.mutate(n.id);
        if (n.link) navigate(n.link);
      }}
    />
  );
}

export function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const activeItem =
    VENDOR_NAV_ITEMS.find((item) => item.to === location.pathname) ?? VENDOR_NAV_ITEMS[0];
  const meta = TITLES[location.pathname] ?? { title: activeItem.label };

  const initials = (profile?.full_name ?? "V")
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DashboardShell
      logoSrc={kmoIcon}
      navItems={VENDOR_NAV_ITEMS}
      activeKey={activeItem.key}
      title={meta.title}
      subtitle={meta.subtitle}
      avatarInitials={initials || "V"}
      onSignOut={() => void signOut()}
      headerRight={<HeaderNotifications />}
      LinkComponent={NavLink}
    >
      <Outlet />
    </DashboardShell>
  );
}
