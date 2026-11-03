insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "menu photos readable" on storage.objects for select
using (bucket_id = 'menu-photos');
create policy "staff upload menu photos" on storage.objects for insert to authenticated
with check (bucket_id = 'menu-photos' and (select private.is_staff_or_admin()));
create policy "staff remove menu photos" on storage.objects for delete to authenticated
using (bucket_id = 'menu-photos' and (select private.is_staff_or_admin()));
