-- Lets the admin hide the three boxes under the homepage banner.
alter table public.platform_settings add column if not exists show_hero_boxes boolean not null default true;
