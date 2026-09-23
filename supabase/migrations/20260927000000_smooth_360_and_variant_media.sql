-- Two upgrades to the 360° feature:
--
-- 1. Smoothness. Eight frames is a visibly "steppy" spin; a turntable-style
--    viewer (Ortery et al) uses 24-36. The angle_index cap goes from 8 to 72
--    so a vendor can upload as many frames as they have — 8 is now the
--    minimum, not the maximum.
--
-- 2. Per-colour sets. A product photographed in three colours needs three
--    spins. `variant_id` null keeps meaning "the set used for every colour",
--    so every existing row stays valid and keeps working untouched.
--
-- `product_images` gains the same optional link, so the normal gallery can
-- switch with the selected colour too.

alter table public.product_360_images
  drop constraint if exists product_360_images_angle_index_check;
alter table public.product_360_images
  add constraint product_360_images_angle_index_check check (angle_index between 1 and 72);

alter table public.product_360_images
  add column if not exists variant_id uuid references public.product_variants (id) on delete cascade;

-- One frame per (product, colour set, position). NULLS NOT DISTINCT so the
-- default set (variant_id null) can't get duplicate positions either.
alter table public.product_360_images
  drop constraint if exists product_360_images_product_id_angle_index_key;
alter table public.product_360_images
  drop constraint if exists product_360_images_set_angle_key;
alter table public.product_360_images
  add constraint product_360_images_set_angle_key
  unique nulls not distinct (product_id, variant_id, angle_index);

create index if not exists product_360_images_variant_idx
  on public.product_360_images (product_id, variant_id, angle_index);

alter table public.product_images
  add column if not exists variant_id uuid references public.product_variants (id) on delete cascade;

create index if not exists product_images_variant_idx
  on public.product_images (product_id, variant_id);
