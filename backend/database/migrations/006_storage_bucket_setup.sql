-- 006_storage_bucket_setup.sql
-- Richtet den Storage-Bucket "order-images" inkl. Policies ein.
-- Hinweis: Keine direkten DELETEs auf storage.* Tabellen (Storage API für Löschungen verwenden).

grant usage on schema storage to anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-images',
  'order-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists "order_images_read_own" on storage.objects;
create policy "order_images_read_own"
on storage.objects
for select
using (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "order_images_insert_own" on storage.objects;
create policy "order_images_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "order_images_update_own" on storage.objects;
create policy "order_images_update_own"
on storage.objects
for update
using (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "order_images_delete_own" on storage.objects;
create policy "order_images_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'order-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
