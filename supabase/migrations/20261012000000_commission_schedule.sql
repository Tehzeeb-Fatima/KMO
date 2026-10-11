-- Commission schedule: no commission for the first N months after a vendor's
-- on-boarding date (vendors.membership_started_at), then the platform rate.
-- vendors.commission_rate becomes an optional per-vendor override (null =
-- use platform_settings.default_commission_rate).
alter table public.platform_settings
  add column if not exists commission_free_months integer not null default 3;

alter table public.vendors alter column commission_rate drop not null;
alter table public.vendors alter column commission_rate drop default;
update public.vendors set commission_rate = null where commission_rate = 0;

update public.platform_settings set default_commission_rate = 8;

-- All current vendors on-board together on 17 October 2026 (Karachi time):
-- membership fee starts 2 months later, commission 3 months later.
update public.vendors set membership_started_at = '2026-10-17 00:00:00+05';
