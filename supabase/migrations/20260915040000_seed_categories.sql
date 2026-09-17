-- Seeds the 13 categories used in the design mockups' "Browse categories" grid
-- and header tabs, so the vendor product form / admin categories list / search
-- filters have real options instead of an empty table.

insert into public.categories (name, slug) values
  ('Electronics', 'electronics'),
  ('Men''s Fashion', 'mens-fashion'),
  ('Women''s Fashion', 'womens-fashion'),
  ('Kids'' Fashion', 'kids-fashion'),
  ('Beauty & Personal Care', 'beauty-personal-care'),
  ('Home & Living', 'home-living'),
  ('Groceries & Essentials', 'groceries-essentials'),
  ('Appliances', 'appliances'),
  ('Sports & Outdoors', 'sports-outdoors'),
  ('Books & Stationery', 'books-stationery'),
  ('Toys & Baby', 'toys-baby'),
  ('Automotive', 'automotive'),
  ('Jewellery & Watches', 'jewellery-watches')
on conflict (slug) do nothing;
