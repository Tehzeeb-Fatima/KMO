-- Electronics > Mobile Cases & Covers, placed right after Mobile Accessories.
update public.categories
set sort_order = sort_order + 1
where parent_id = (select id from public.categories where slug = 'electronics')
  and sort_order >= 3
  and not exists (select 1 from public.categories where slug = 'electronics-mobile-cases-covers');

insert into public.categories (name, slug, parent_id, sort_order)
select 'Mobile Cases & Covers', 'electronics-mobile-cases-covers', id, 3
from public.categories
where slug = 'electronics'
on conflict (slug) do nothing;
