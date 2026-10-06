-- Lets admins (and staff with the Vendors module) upload a vendor's logo and
-- banner from the admin panel, e.g. for vendors who are not tech-savvy.
-- Vendors keep their own owner policies; these sit alongside them.

drop policy if exists "vendor_media_admin_write" on storage.objects;
create policy "vendor_media_admin_write"
  on storage.objects for insert
  with check (bucket_id = 'vendor-media' and (public.is_admin(auth.uid()) or public.staff_can('vendors')));

drop policy if exists "vendor_media_admin_update" on storage.objects;
create policy "vendor_media_admin_update"
  on storage.objects for update
  using (bucket_id = 'vendor-media' and (public.is_admin(auth.uid()) or public.staff_can('vendors')));

drop policy if exists "vendor_media_admin_delete" on storage.objects;
create policy "vendor_media_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'vendor-media' and (public.is_admin(auth.uid()) or public.staff_can('vendors')));
