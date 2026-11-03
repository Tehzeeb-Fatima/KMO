-- Product rating shown on cards: an admin-set starting rating (e.g. 4.8 from
-- 20 ratings) blended with real customer reviews. Review totals are kept on
-- the product so cards don't need to read the reviews table.
alter table public.products
  add column if not exists admin_rating numeric(2,1) check (admin_rating is null or admin_rating between 1 and 5),
  add column if not exists admin_rating_count integer check (admin_rating_count is null or admin_rating_count > 0),
  add column if not exists review_count integer not null default 0,
  add column if not exists review_sum integer not null default 0;

-- Only an admin sets the sold tag and admin rating; only the reviews trigger
-- below sets the review totals.
create or replace function public.products_sold_badge_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if tg_op = 'UPDATE' then
      new.sold_badge := old.sold_badge;
      new.admin_rating := old.admin_rating;
      new.admin_rating_count := old.admin_rating_count;
    else
      new.sold_badge := null;
      new.admin_rating := null;
      new.admin_rating_count := null;
    end if;
  end if;
  if current_setting('kmo.review_stats', true) is distinct from 'on' then
    if tg_op = 'UPDATE' then
      new.review_count := old.review_count;
      new.review_sum := old.review_sum;
    else
      new.review_count := 0;
      new.review_sum := 0;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.refresh_product_review_stats(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('kmo.review_stats', 'on', true);
  update public.products p
     set review_count = s.n, review_sum = s.total
    from (select count(*)::int n, coalesce(sum(rating), 0)::int total
            from public.reviews
           where product_id = p_product_id and not coalesce(is_flagged, false)) s
   where p.id = p_product_id;
  perform set_config('kmo.review_stats', 'off', true);
end;
$$;
revoke all on function public.refresh_product_review_stats(uuid) from public, anon, authenticated;

create or replace function public.reviews_refresh_product_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_product_review_stats(old.product_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.product_id is distinct from old.product_id
      or new.rating is distinct from old.rating or new.is_flagged is distinct from old.is_flagged) then
    perform public.refresh_product_review_stats(new.product_id);
  end if;
  return null;
end;
$$;
drop trigger if exists reviews_refresh_product_stats on public.reviews;
create trigger reviews_refresh_product_stats after insert or update or delete on public.reviews
  for each row execute function public.reviews_refresh_product_stats();

-- backfill from existing reviews
select public.refresh_product_review_stats(id) from public.products
 where id in (select distinct product_id from public.reviews where product_id is not null);
