-- Admin can turn on a reminder popup that nags every vendor, on every
-- login, to set their delivery charge — until that vendor dismisses it
-- (dc_reminder_acknowledged). A vendor who never sets a rate just gets
-- free (Rs. 0) delivery on their products, per the existing precedence.

alter table public.platform_settings
  add column if not exists dc_reminder_enabled boolean not null default false;

alter table public.vendors
  add column if not exists dc_reminder_acknowledged boolean not null default false;
