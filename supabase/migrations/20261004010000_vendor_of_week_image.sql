-- Banner image for the admin-chosen "Vendor of the week" card on the homepage.
alter table public.platform_settings
  add column if not exists vendor_of_week_image_url text;
