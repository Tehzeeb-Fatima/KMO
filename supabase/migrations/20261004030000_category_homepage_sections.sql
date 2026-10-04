-- Admin picks which categories get a product section on the homepage, and their order.
alter table public.categories
  add column if not exists show_on_homepage boolean not null default false,
  add column if not exists homepage_order integer not null default 0;
