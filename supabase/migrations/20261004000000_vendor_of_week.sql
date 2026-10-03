-- Admin-chosen "Vendor of the week" for the homepage. NULL falls back to the first approved vendor.
alter table public.platform_settings
  add column if not exists vendor_of_week_id uuid references public.vendors(id) on delete set null;
