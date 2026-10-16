-- Admin must explicitly mark a vendor "ready" (after setting their Courier
-- password) before the connect popup shows on that vendor's dashboard.
-- Otherwise every unconnected vendor would see the popup immediately,
-- including ones admin hasn't assigned a password to yet.

alter table public.vendors
  add column if not exists courier_popup_ready boolean not null default false;
