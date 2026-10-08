-- Groceries & Essentials is not offered yet. Its subcategories go with it
-- (parent_id is ON DELETE CASCADE); it had no products, vendors or promotions.
delete from public.categories where slug = 'groceries-essentials';
