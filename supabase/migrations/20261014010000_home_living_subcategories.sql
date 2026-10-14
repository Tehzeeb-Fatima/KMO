-- Home & Living gets sub-categories for products that had no fitting one
-- (tool kits, travel bags, bike/car covers).
insert into public.categories (name, slug, parent_id, sort_order)
select s.name, s.slug, c.id, s.sort_order
from public.categories c,
  (values
    ('Tools & Hardware', 'home-living-tools-hardware', 10),
    ('Travel & Luggage', 'home-living-travel-luggage', 11),
    ('Car & Bike Accessories', 'home-living-car-bike-accessories', 12)
  ) as s(name, slug, sort_order)
where c.name = 'Home & Living' and c.parent_id is null
on conflict (slug) do nothing;
