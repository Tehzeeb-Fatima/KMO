-- Media files now live on media.karachimartonline.com (Hostinger). Its upload
-- script asks this function, with the uploader's own login, whether they may
-- write that file. The rules mirror the old Supabase Storage policies.
create or replace function public.can_write_media(p_bucket text, p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and case p_bucket
    when 'product-media' then
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or exists (
        select 1 from public.products pr join public.vendors v on v.id = pr.vendor_id
        where v.owner_id = auth.uid() and pr.id::text = split_part(p_path, '/', 1)
      )
    when 'vendor-media' then
      public.is_admin(auth.uid()) or public.staff_can('vendors')
      or exists (select 1 from public.vendors v where v.owner_id = auth.uid() and v.id::text = split_part(p_path, '/', 1))
    when 'category-media' then
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    when 'promotion-media' then
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    else false
  end
$$;

revoke all on function public.can_write_media(text, text) from public, anon;
grant execute on function public.can_write_media(text, text) to authenticated;
