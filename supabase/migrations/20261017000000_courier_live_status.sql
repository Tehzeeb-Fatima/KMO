-- Courier Fast Service has no outgoing webhook for status changes — KMO
-- has to pull the latest status via /integrations/sync-statuses. These
-- columns hold what Courier last reported, separate from KMO's own
-- courier_booking_status workflow (requested/rejected/booked).

alter table public.orders
  add column if not exists courier_live_status text,
  add column if not exists courier_expected_delivery date;
