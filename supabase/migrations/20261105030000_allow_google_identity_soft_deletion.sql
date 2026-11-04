-- GoTrue v2.197 first marks auth.users deleted, then clears identity_data and
-- obfuscates provider_id. This is not an unverified Google login or identity link.
-- Run as the database migration administrator; do not change Auth table owners.
create or replace function private.guard_google_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_permission uuid;
begin
  if new.provider <> 'google' then return new; end if;
  if exists(select 1 from auth.users where id=new.user_id and deleted_at is not null) then
    if tg_op='UPDATE' and new.user_id=old.user_id
      and new.provider=old.provider and new.identity_data='{}'::jsonb then
      return new;
    end if;
    raise exception 'Deleted accounts cannot authenticate or link Google.';
  end if;
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
revoke all on function private.guard_google_identity() from public, anon, authenticated;
