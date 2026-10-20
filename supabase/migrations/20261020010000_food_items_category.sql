-- Main category renamed to "Food Items"; "Food & Dry Fruits" becomes a sub-category under it.
-- Already applied to the live project on 2026-10-20; safe to re-run.

update public.categories
set name = 'Food Items', slug = 'food-items'
where slug = 'food-dry-fruits';

insert into public.categories (name, slug, parent_id, sort_order)
select 'Food & Dry Fruits', 'food-items-food-dry-fruits', c.id, 0
from public.categories c
where c.slug = 'food-items'
on conflict (slug) do nothing;
