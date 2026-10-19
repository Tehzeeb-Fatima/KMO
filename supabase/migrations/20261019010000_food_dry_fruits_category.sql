-- Food & Dry Fruits main category with its sub-categories (first vendor: Karachi Dry Fruit).
-- Already applied to the live project on 2026-10-19; safe to re-run.

insert into public.categories (name, slug, icon)
values ('Food & Dry Fruits', 'food-dry-fruits', 'basket')
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select v.name, v.slug, c.id, v.sort_order
from (values
  ('Dry Fruits & Nuts', 'food-dry-fruits-dry-fruits-nuts', 1),
  ('Dates (Khajoor)', 'food-dry-fruits-dates-khajoor', 2),
  ('Gift Boxes & Hampers', 'food-dry-fruits-gift-boxes-hampers', 3)
) as v(name, slug, sort_order)
cross join public.categories c
where c.slug = 'food-dry-fruits'
on conflict (slug) do nothing;
