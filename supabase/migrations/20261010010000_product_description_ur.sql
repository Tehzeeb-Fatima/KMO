-- Optional Urdu description, shown on the product page when the shopper has
-- the site in Urdu; the English description is used when it is empty.
alter table public.products add column if not exists description_ur text;
