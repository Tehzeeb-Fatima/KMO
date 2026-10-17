-- Product and store text stays emoji-free: whatever a vendor or admin types,
-- emoji are removed when the row is saved. Keeps •, –, ©, ®, ™ and plain text.
create or replace function public.strip_emoji(t text)
returns text
language sql
immutable
as $$
  select case when t is null then null else
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            t,
            '[\U0001F000-\U0001FAFF\u2300-\u23FF\u2460-\u24FF\u2600-\u27BF\u2900-\u297F\u2B00-\u2BFF\u3030\u303D\u3297\u3299\uFE0E\uFE0F\u200D\u20E3\U000E0020-\U000E007F]',
            '', 'g'),
          '[ \t]{2,}', ' ', 'g'),
        '[ \t]*\n[ \t]*', E'\n', 'g'),
      E' \t\n')
  end
$$;

create or replace function public.products_strip_emoji()
returns trigger
language plpgsql
as $$
begin
  new.name := public.strip_emoji(new.name);
  new.description := public.strip_emoji(new.description);
  new.description_ur := public.strip_emoji(new.description_ur);
  if new.tags is not null then
    new.tags := array(select s from (select public.strip_emoji(x) s from unnest(new.tags) x) q where s <> '');
  end if;
  return new;
end;
$$;

drop trigger if exists products_strip_emoji on public.products;
create trigger products_strip_emoji
  before insert or update of name, description, description_ur, tags on public.products
  for each row execute function public.products_strip_emoji();

create or replace function public.vendors_strip_emoji()
returns trigger
language plpgsql
as $$
begin
  new.store_name := public.strip_emoji(new.store_name);
  new.description := public.strip_emoji(new.description);
  return new;
end;
$$;

drop trigger if exists vendors_strip_emoji on public.vendors;
create trigger vendors_strip_emoji
  before insert or update of store_name, description on public.vendors
  for each row execute function public.vendors_strip_emoji();
