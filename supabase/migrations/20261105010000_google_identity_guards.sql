-- No backfill, merges, profile/role changes or transaction edits. Pre-existing
-- duplicate emails make this migration fail rather than choosing an owner.
create unique index ngwanam_auth_email_unique
  on auth.users (lower(btrim(email))) where email is not null and btrim(email) <> '';

create table private.google_identity_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  expires_at timestamptz not null
);
alter table private.google_identity_permissions enable row level security;
revoke all on private.google_identity_permissions from public, anon, authenticated;

-- Auth inserts the user before its first identity. A new Google registration
-- gets one permission; existing accounts never get one from matching emails.
create function private.prepare_google_registration() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'provider' = 'google' then
    insert into private.google_identity_permissions(user_id,email,expires_at)
    values(new.id,lower(btrim(new.email)),now()+interval '5 minutes');
  end if;
  return new;
end;
$$;
create trigger ngwanam_prepare_google_registration after insert on auth.users
for each row execute function private.prepare_google_registration();

create function public.approve_google_link() returns void
language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  -- A session cookie alone is not approval: require a fresh password sign-in.
  if auth.uid() is null or not exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a
    where a->>'method' = 'password'
      and (a->>'timestamp')::numeric between extract(epoch from now())-60 and extract(epoch from now())+5
  ) then raise exception 'Re-enter your password before linking Google.'; end if;
  select lower(btrim(u.email)) into v_email from auth.users u
    join public.profiles p on p.id=u.id
    where u.id=auth.uid() and u.email_confirmed_at is not null and p.is_active;
  if v_email is null then raise exception 'An active, confirmed account is required.'; end if;
  if exists(select 1 from auth.identities where user_id=auth.uid() and provider='google') then
    raise exception 'Google is already linked.';
  end if;
  insert into private.google_identity_permissions(user_id,email,expires_at)
    values(auth.uid(),v_email,now()+interval '5 minutes')
    on conflict(user_id) do update set email=excluded.email,expires_at=excluded.expires_at;
end;
$$;
revoke all on function public.approve_google_link() from public, anon;
grant execute on function public.approve_google_link() to authenticated;

create function private.guard_google_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_permission uuid;
begin
  if new.provider <> 'google' then return new; end if;
  -- Provider identity data, not editable user_metadata or email_confirmed_at.
  if new.identity_data->'email_verified' is distinct from 'true'::jsonb then
    raise exception 'Google must verify this email address.';
  end if;
  v_email := lower(btrim(new.identity_data->>'email'));
  if nullif(v_email,'') is null or not exists (
    select 1 from auth.users where id=new.user_id and lower(btrim(email))=v_email
  ) then raise exception 'Choose the Google account with your existing account email.'; end if;
  if tg_op='INSERT' then
    delete from private.google_identity_permissions
      where user_id=new.user_id and email=v_email and expires_at>now()
      returning user_id into v_permission;
    if v_permission is null then
      raise exception 'Sign in with your existing password, then explicitly link Google in Account security.';
    end if;
  elsif new.user_id is distinct from old.user_id or new.provider_id is distinct from old.provider_id then
    raise exception 'Google identities cannot be transferred.';
  end if;
  return new;
end;
$$;
create trigger ngwanam_google_identity_guard before insert or update on auth.identities
for each row execute function private.guard_google_identity();
revoke all on function private.prepare_google_registration() from public, anon, authenticated;
revoke all on function private.guard_google_identity() from public, anon, authenticated;

create function public.google_auth_ready() returns boolean
language sql set search_path = '' as $$ select true $$;
revoke all on function public.google_auth_ready() from public;
grant execute on function public.google_auth_ready() to anon, authenticated;
