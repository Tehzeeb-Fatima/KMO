import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell, NotificationBell, type NotificationItem } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@kmo/shared/api";
import { ADMIN_NAV_ITEMS } from "../dashboard-nav";
import kmoIcon from "../assets/kmo-icon.png";
import { supabase } from "../lib/supabase";

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Overview", subtitle: "Platform-wide performance" },
  "/vendors": { title: "Vendors", subtitle: "Manage vendor accounts" },
  "/orders": { title: "Orders", subtitle: "All orders across vendors" },
  "/products": { title: "Products", subtitle: "Catalogue moderation" },
  "/customers": { title: "Customers", subtitle: "Registered shoppers" },
  "/payouts": { title: "Payouts", subtitle: "Vendor payouts and commission" },
  "/categories": { title: "Categories", subtitle: "Storefront category tree" },
  "/couriers": { title: "Couriers", subtitle: "Courier fee slabs by city and weight" },
  "/promotions": { title: "Promotions", subtitle: "Homepage deals with a countdown" },
  "/returns": { title: "Returns", subtitle: "Review return requests" },
  "/reviews": { title: "Reviews", subtitle: "Review moderation" },
  "/contact-messages": { title: "Contact requests", subtitle: "Messages from the contact form" },
  "/audit-log": { title: "Audit log", subtitle: "Recent admin actions" },
  "/settings": { title: "Settings", subtitle: "Platform configuration" },
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
      onSignOut={() => void signOut()}
      headerRight={<HeaderNotifications />}
      LinkComponent={NavLink}
    >
      <Outlet />
    </DashboardShell>
  );
}
