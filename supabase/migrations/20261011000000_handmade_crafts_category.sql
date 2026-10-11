-- New main category for handmade sellers (crochet, embroidery, crafts).
insert into public.categories (name, slug, icon, sort_order)
values ('Handmade & Crafts', 'handmade-crafts', 'scissors', 0)
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select s.name, s.slug, c.id, s.sort_order
from public.categories c,
  (values
    ('Crochet Clothing & Shawls', 'handmade-crafts-crochet-clothing-shawls', 1),
    ('Crochet Bags & Purses', 'handmade-crafts-crochet-bags-purses', 2),
    ('Baby Crochet (Caps, Booties, Sets)', 'handmade-crafts-baby-crochet', 3),
    ('Crochet Toys & Dolls', 'handmade-crafts-crochet-toys-dolls', 4),
    ('Crochet Home Décor', 'handmade-crafts-crochet-home-decor', 5),
    ('Hand Embroidery', 'handmade-crafts-hand-embroidery', 6),
    ('Handmade Jewellery & Accessories', 'handmade-crafts-handmade-jewellery-accessories', 7),
    ('Handmade Gifts & Hampers', 'handmade-crafts-handmade-gifts-hampers', 8)
  ) as s(name, slug, sort_order)
where c.slug = 'handmade-crafts'
on conflict (slug) do nothing;
