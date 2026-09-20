-- Category images (shown in the homepage "Browse categories" strip) and a
-- storage bucket admins can upload them to.

alter table public.categories add column image_url text;

insert into storage.buckets (id, name, public)
values ('category-media', 'category-media', true)
on conflict (id) do nothing;

create policy "category_media_public_select"
  on storage.objects for select
  using (bucket_id = 'category-media');

create policy "category_media_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'category-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "category_media_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'category-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "category_media_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'category-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
