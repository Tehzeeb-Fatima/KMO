-- Public pages can't read other customers' profiles (RLS), so every review
-- showed "Customer". Store a public display name on the review itself:
-- first name + last initial (e.g. "Ayesha K."), set automatically.

alter table public.reviews add column if not exists reviewer_name text;

create or replace function public.review_display_name(p_customer uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(trim(full_name), '') = '' then null
    when position(' ' in trim(full_name)) = 0 then initcap(trim(full_name))
    else initcap(split_part(trim(full_name), ' ', 1)) || ' '
         || upper(left(trim(regexp_replace(trim(full_name), '^\S+\s+', '')), 1)) || '.'
  end
  from public.profiles where id = p_customer
$$;

create or replace function public.reviews_set_reviewer_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reviewer_name is null then
    new.reviewer_name := public.review_display_name(new.customer_id);
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_set_reviewer_name on public.reviews;
create trigger reviews_set_reviewer_name
  before insert on public.reviews
  for each row execute function public.reviews_set_reviewer_name();

update public.reviews
set reviewer_name = public.review_display_name(customer_id)
where reviewer_name is null;
