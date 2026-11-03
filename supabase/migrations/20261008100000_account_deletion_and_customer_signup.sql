alter table public.profiles add column if not exists deleted_at timestamptz;

-- Never trust signup metadata for authorization. Admin-created operational
-- accounts start as customers too, and are promoted by the admin-only action.
create or replace function public.create_customer_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''), 'customer');
  return new;
end;
$$;

create or replace function public.admin_prepare_account_deletion(p_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Admin access required'; end if;
  if p_profile_id = auth.uid() then raise exception 'own-account'; end if;
  perform 1 from public.profiles where id=p_profile_id and deleted_at is null for update;
  if not found then raise exception 'account-not-found'; end if;
  if exists(select 1 from public.profiles where id=p_profile_id and role='admin' and is_active)
    and (select count(*) from public.profiles where role='admin' and is_active and deleted_at is null)<2
    then raise exception 'last-admin'; end if;
  if exists(select 1 from public.orders where customer_id=p_profile_id and status not in ('completed','cancelled'))
    or exists(select 1 from public.deliveries d join public.orders o on o.id=d.order_id
      where d.assigned_to=p_profile_id and o.status not in ('completed','cancelled'))
    then raise exception 'unfinished-work'; end if;
  -- Block existing sessions before the Auth API removes credentials.
  update public.profiles set is_active=false where id=p_profile_id;
end;
$$;
revoke all on function public.admin_prepare_account_deletion(uuid) from public, anon;
grant execute on function public.admin_prepare_account_deletion(uuid) to authenticated;
