-- Sub-categories under each main category (e.g. Women's Fashion > Lingerie).
-- Vendors stay assigned to main categories and can list products in any of
-- their sub-categories; the storefront shows a main category's products
-- together with everything in its sub-categories.

alter table public.categories add column if not exists sort_order integer not null default 0;

-- Removing a main category removes its sub-categories too, instead of
-- silently promoting them to main categories.
alter table public.categories drop constraint if exists categories_parent_id_fkey;
alter table public.categories
  add constraint categories_parent_id_fkey
  foreign key (parent_id) references public.categories(id) on delete cascade;

create index if not exists categories_parent_id_idx on public.categories (parent_id);

insert into public.categories (parent_id, name, slug, sort_order)
select p.id, v.name, v.slug, v.sort_order
from (values
  ('womens-fashion', 'Unstitched (Lawn, Khaddar, Chiffon)', 'womens-fashion-unstitched-lawn-khaddar-chiffon', 1),
  ('womens-fashion', 'Stitched / Ready-to-wear', 'womens-fashion-stitched-ready-to-wear', 2),
  ('womens-fashion', 'Kurtis & Tops', 'womens-fashion-kurtis-tops', 3),
  ('womens-fashion', 'Formal & Bridal Wear', 'womens-fashion-formal-bridal-wear', 4),
  ('womens-fashion', 'Abaya, Hijab & Dupatta', 'womens-fashion-abaya-hijab-dupatta', 5),
  ('womens-fashion', 'Shawls & Stoles', 'womens-fashion-shawls-stoles', 6),
  ('womens-fashion', 'Trousers, Shalwar & Tights', 'womens-fashion-trousers-shalwar-tights', 7),
  ('womens-fashion', 'Western Wear', 'womens-fashion-western-wear', 8),
  ('womens-fashion', 'Nightwear & Loungewear', 'womens-fashion-nightwear-loungewear', 9),
  ('womens-fashion', 'Lingerie & Innerwear', 'womens-fashion-lingerie-innerwear', 10),
  ('womens-fashion', 'Women''s Footwear', 'womens-fashion-women-s-footwear', 11),
  ('womens-fashion', 'Handbags & Clutches', 'womens-fashion-handbags-clutches', 12),
  ('mens-fashion', 'Shalwar Kameez & Kurta', 'mens-fashion-shalwar-kameez-kurta', 1),
  ('mens-fashion', 'Unstitched Fabric', 'mens-fashion-unstitched-fabric', 2),
  ('mens-fashion', 'Waistcoats & Sherwani', 'mens-fashion-waistcoats-sherwani', 3),
  ('mens-fashion', 'Shirts & T-shirts', 'mens-fashion-shirts-t-shirts', 4),
  ('mens-fashion', 'Jeans & Trousers', 'mens-fashion-jeans-trousers', 5),
  ('mens-fashion', 'Activewear & Tracksuits', 'mens-fashion-activewear-tracksuits', 6),
  ('mens-fashion', 'Innerwear & Socks', 'mens-fashion-innerwear-socks', 7),
  ('mens-fashion', 'Men''s Footwear', 'mens-fashion-men-s-footwear', 8),
  ('mens-fashion', 'Wallets, Belts & Caps', 'mens-fashion-wallets-belts-caps', 9),
  ('kids-fashion', 'Girls'' Clothing', 'kids-fashion-girls-clothing', 1),
  ('kids-fashion', 'Boys'' Clothing', 'kids-fashion-boys-clothing', 2),
  ('kids-fashion', 'Baby Clothing (0–2 years)', 'kids-fashion-baby-clothing-0-2-years', 3),
  ('kids-fashion', 'School Uniforms', 'kids-fashion-school-uniforms', 4),
  ('kids-fashion', 'Kids'' Footwear', 'kids-fashion-kids-footwear', 5),
  ('kids-fashion', 'Kids'' Accessories', 'kids-fashion-kids-accessories', 6),
  ('jewellery-watches', 'Necklaces & Sets', 'jewellery-watches-necklaces-sets', 1),
  ('jewellery-watches', 'Earrings & Jhumkay', 'jewellery-watches-earrings-jhumkay', 2),
  ('jewellery-watches', 'Rings', 'jewellery-watches-rings', 3),
  ('jewellery-watches', 'Bangles & Bracelets', 'jewellery-watches-bangles-bracelets', 4),
  ('jewellery-watches', 'Anklets (Payal)', 'jewellery-watches-anklets-payal', 5),
  ('jewellery-watches', 'Bridal Jewellery', 'jewellery-watches-bridal-jewellery', 6),
  ('jewellery-watches', 'Silver Jewellery', 'jewellery-watches-silver-jewellery', 7),
  ('jewellery-watches', 'Hair Accessories (Tikka, Jhoomar)', 'jewellery-watches-hair-accessories-tikka-jhoomar', 8),
  ('jewellery-watches', 'Men''s Watches', 'jewellery-watches-men-s-watches', 9),
  ('jewellery-watches', 'Women''s Watches', 'jewellery-watches-women-s-watches', 10),
  ('jewellery-watches', 'Sunglasses', 'jewellery-watches-sunglasses', 11),
  ('beauty-personal-care', 'Makeup', 'beauty-personal-care-makeup', 1),
  ('beauty-personal-care', 'Skincare', 'beauty-personal-care-skincare', 2),
  ('beauty-personal-care', 'Haircare', 'beauty-personal-care-haircare', 3),
  ('beauty-personal-care', 'Fragrances & Attar', 'beauty-personal-care-fragrances-attar', 4),
  ('beauty-personal-care', 'Mehndi & Nail Care', 'beauty-personal-care-mehndi-nail-care', 5),
  ('beauty-personal-care', 'Bath & Body', 'beauty-personal-care-bath-body', 6),
  ('beauty-personal-care', 'Men''s Grooming', 'beauty-personal-care-men-s-grooming', 7),
  ('beauty-personal-care', 'Beauty Tools & Devices', 'beauty-personal-care-beauty-tools-devices', 8),
  ('home-living', 'Bedsheets & Bedding', 'home-living-bedsheets-bedding', 1),
  ('home-living', 'Curtains & Cushions', 'home-living-curtains-cushions', 2),
  ('home-living', 'Home Décor', 'home-living-home-decor', 3),
  ('home-living', 'Kitchenware & Cookware', 'home-living-kitchenware-cookware', 4),
  ('home-living', 'Dinner Sets & Crockery', 'home-living-dinner-sets-crockery', 5),
  ('home-living', 'Storage & Organisers', 'home-living-storage-organisers', 6),
  ('home-living', 'Cleaning Supplies', 'home-living-cleaning-supplies', 7),
  ('home-living', 'Prayer Mats & Islamic Décor', 'home-living-prayer-mats-islamic-decor', 8),
  ('home-living', 'Lights & Lamps', 'home-living-lights-lamps', 9),
  ('electronics', 'Mobile Phones', 'electronics-mobile-phones', 1),
  ('electronics', 'Mobile Accessories', 'electronics-mobile-accessories', 2),
  ('electronics', 'Earbuds & Headphones', 'electronics-earbuds-headphones', 3),
  ('electronics', 'Smart Watches', 'electronics-smart-watches', 4),
  ('electronics', 'Power Banks', 'electronics-power-banks', 5),
  ('electronics', 'Laptop & Computer Accessories', 'electronics-laptop-computer-accessories', 6),
  ('electronics', 'Home Appliances', 'electronics-home-appliances', 7),
  ('electronics', 'Personal Care Appliances', 'electronics-personal-care-appliances', 8),
  ('groceries-essentials', 'Rice, Atta & Daal', 'groceries-essentials-rice-atta-daal', 1),
  ('groceries-essentials', 'Cooking Oil & Ghee', 'groceries-essentials-cooking-oil-ghee', 2),
  ('groceries-essentials', 'Spices & Masalay', 'groceries-essentials-spices-masalay', 3),
  ('groceries-essentials', 'Tea & Beverages', 'groceries-essentials-tea-beverages', 4),
  ('groceries-essentials', 'Snacks & Biscuits', 'groceries-essentials-snacks-biscuits', 5),
  ('groceries-essentials', 'Dry Fruits', 'groceries-essentials-dry-fruits', 6),
  ('groceries-essentials', 'Dairy & Breakfast', 'groceries-essentials-dairy-breakfast', 7),
  ('groceries-essentials', 'Household Essentials', 'groceries-essentials-household-essentials', 8),
  ('toys-baby', 'Toys & Games', 'toys-baby-toys-games', 1),
  ('toys-baby', 'Educational Toys', 'toys-baby-educational-toys', 2),
  ('toys-baby', 'Diapers & Wipes', 'toys-baby-diapers-wipes', 3),
  ('toys-baby', 'Baby Feeding', 'toys-baby-baby-feeding', 4),
  ('toys-baby', 'Baby Care', 'toys-baby-baby-care', 5),
  ('toys-baby', 'Prams, Walkers & Carriers', 'toys-baby-prams-walkers-carriers', 6),
  ('books-stationery', 'School Books', 'books-stationery-school-books', 1),
  ('books-stationery', 'Islamic Books', 'books-stationery-islamic-books', 2),
  ('books-stationery', 'Novels & Urdu Literature', 'books-stationery-novels-urdu-literature', 3),
  ('books-stationery', 'Notebooks & Registers', 'books-stationery-notebooks-registers', 4),
  ('books-stationery', 'Pens & Art Supplies', 'books-stationery-pens-art-supplies', 5),
  ('books-stationery', 'Office Supplies', 'books-stationery-office-supplies', 6)
) as v(parent_slug, name, slug, sort_order)
join public.categories p on p.slug = v.parent_slug
on conflict (slug) do nothing;
