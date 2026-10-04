-- Optional category shown as a product section below the homepage testimonials.
alter table public.platform_settings
  add column if not exists bottom_category_id uuid references public.categories(id) on delete set null;
