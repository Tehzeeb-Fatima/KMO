alter table public.platform_settings
  add column maintenance_mode boolean not null default false;
