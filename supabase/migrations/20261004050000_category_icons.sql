-- Icon key for the homepage category tile (one of the presets in packages/shared/src/lib/category-icons.ts).
alter table public.categories add column if not exists icon text;

update public.categories set icon = case slug
  when 'electronics' then 'monitor'
  when 'groceries-essentials' then 'basket'
  when 'books-stationery' then 'book'
  when 'beauty-personal-care' then 'sparkles'
  when 'home-living' then 'house'
  when 'jewellery-watches' then 'gem'
  when 'kids-fashion' then 'smile'
  when 'mens-fashion' then 'shirt'
  when 'toys-baby' then 'puzzle'
  when 'womens-fashion' then 'handbag'
  else 'tag'
end
where icon is null;
