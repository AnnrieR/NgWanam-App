create or replace function public.admin_update_profile(p_profile_id uuid, p_role public.profile_role, p_is_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Only admins can manage account roles.'; end if;
  if p_profile_id = (select auth.uid()) and not p_is_active then
    raise exception 'You cannot deactivate your own account.';
  end if;
  update public.profiles set role = p_role, is_active = p_is_active where id = p_profile_id;
  if not found then raise exception 'Profile not found.'; end if;
end;
$$;

grant execute on function public.admin_update_profile(uuid, public.profile_role, boolean) to authenticated;
revoke execute on function public.admin_update_profile(uuid, public.profile_role, boolean) from public, anon;
