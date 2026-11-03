-- Additional customer profile details surfaced on the Profile screen
-- (address, birth date, gender) plus a profile photo stored in Supabase Storage.

alter table public.profiles
  add column if not exists address text,
  add column if not exists birth_date date,
  add column if not exists gender text,
  add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('female', 'male', 'non_binary', 'prefer_not_to_say'));

-- Public bucket for profile photos. Objects live under {user_id}/... so the
-- storage policies below can scope uploads to the owning account.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "users replace their own avatar" on storage.objects;
create policy "users replace their own avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "users remove their own avatar" on storage.objects;
create policy "users remove their own avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
