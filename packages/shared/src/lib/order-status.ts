import type { OrderStatus } from "../types";
import type { StatusBadgeVariant } from "../ui/status-badge";

/** Matches the 4-color badge system confirmed across the vendor/admin order
 * tables: green=positive, amber=in-progress, purple=shipped/in-transit,
 * red=negative. */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; variant: StatusBadgeVariant }
> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "warning" },
  processing: { label: "Processing", variant: "warning" },
  ready_to_ship: { label: "Ready to ship", variant: "info" },
  shipped: { label: "Shipped", variant: "info" },
  out_for_delivery: { label: "Out for delivery", variant: "info" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
  returned: { label: "Returned", variant: "danger" },
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
];
