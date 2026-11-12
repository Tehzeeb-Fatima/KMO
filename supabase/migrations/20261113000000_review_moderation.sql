-- Reviews: admin approval before they go public, the reviewer's real name
-- instead of "Customer", and each role limited to the fields it owns.

alter table public.reviews add column if not exists reviewer_name text;
alter table public.reviews add column if not exists status text not null default 'pending';
alter table public.reviews drop constraint if exists reviews_status_check;
alter table public.reviews add constraint reviews_status_check check (status in ('pending', 'approved', 'rejected'));
alter table public.reviews add column if not exists reviewed_at timestamptz;

-- First name + last initial ("Ayesha K."): the account name, or else the
-- name the customer gave on their latest order.
create or replace function public.review_display_name(p_customer uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with n as (
    select coalesce(
      nullif(trim((select full_name from public.profiles where id = p_customer)), ''),
      (select nullif(trim(ship_name), '') from public.orders
        where customer_id = p_customer and nullif(trim(ship_name), '') is not null
        order by created_at desc limit 1)
    ) as full_name
  )
  select case
    when full_name is null then null
    when position(' ' in full_name) = 0 then initcap(full_name)
    else initcap(split_part(full_name, ' ', 1)) || ' '
         || upper(left(trim(regexp_replace(full_name, '^\S+\s+', '')), 1)) || '.'
  end
  from n
$$;

create or replace function public.reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moderator boolean := auth.uid() is null or public.is_admin(auth.uid()) or public.staff_can('reviews');
begin
  if tg_op = 'INSERT' then
    if not v_moderator then
      new.status := 'pending';
      new.reviewed_at := null;
      new.is_flagged := false;
      new.flag_reason := null;
      new.vendor_reply := null;
      new.vendor_reply_at := null;
      new.reviewer_name := public.review_display_name(new.customer_id);
    elsif new.reviewer_name is null then
      new.reviewer_name := public.review_display_name(new.customer_id);
    end if;
    return new;
  end if;

  if v_moderator then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
    end if;
    return new;
  end if;

  if auth.uid() = old.customer_id then
    -- the customer may edit their words and stars; an edit goes back for approval
    new.product_id := old.product_id;
    new.customer_id := old.customer_id;
    new.order_item_id := old.order_item_id;
    new.reviewer_name := old.reviewer_name;
    new.is_flagged := old.is_flagged;
    new.flag_reason := old.flag_reason;
    new.vendor_reply := old.vendor_reply;
    new.vendor_reply_at := old.vendor_reply_at;
    new.created_at := old.created_at;
    if new.rating is distinct from old.rating or new.body is distinct from old.body then
      new.status := 'pending';
      new.reviewed_at := null;
    else
      new.status := old.status;
      new.reviewed_at := old.reviewed_at;
    end if;
    return new;
  end if;

  -- the vendor may only reply
  new.product_id := old.product_id;
  new.customer_id := old.customer_id;
  new.order_item_id := old.order_item_id;
  new.rating := old.rating;
  new.body := old.body;
  new.reviewer_name := old.reviewer_name;
  new.is_flagged := old.is_flagged;
  new.flag_reason := old.flag_reason;
  new.status := old.status;
  new.reviewed_at := old.reviewed_at;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists reviews_set_reviewer_name on public.reviews;
drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.reviews_guard();

-- The public sees approved reviews only (customers still see their own,
-- vendors still see their products' reviews, through the existing policies).
drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select on public.reviews for select
  using (status = 'approved' and not is_flagged);

-- Rating totals on products count approved reviews only.
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
           where product_id = p_product_id and status = 'approved' and not coalesce(is_flagged, false)) s
   where p.id = p_product_id;
  perform set_config('kmo.review_stats', 'off', true);
end;
$$;

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
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and (new.product_id is distinct from old.product_id
      or new.rating is distinct from old.rating or new.is_flagged is distinct from old.is_flagged
      or new.status is distinct from old.status)) then
    perform public.refresh_product_review_stats(new.product_id);
  end if;
  return null;
end;
$$;

-- Reviews already on the site stay up; fill in names where we have one.
alter table public.reviews disable trigger reviews_guard;
update public.reviews set status = 'approved', reviewed_at = coalesce(reviewed_at, now()) where status = 'pending';
update public.reviews set reviewer_name = public.review_display_name(customer_id) where reviewer_name is null;
alter table public.reviews enable trigger reviews_guard;
