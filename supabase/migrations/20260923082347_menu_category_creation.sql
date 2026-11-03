create or replace function public.create_menu_category(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_category_id uuid; v_sort_order smallint;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can create categories.'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Category name is required.'; end if;
  perform pg_advisory_xact_lock(hashtext('public.categories.sort_order'));
  select coalesce(max(sort_order), -1) + 1 into v_sort_order from public.categories;
  insert into public.categories (name, sort_order) values (trim(p_name), v_sort_order) returning id into v_category_id;
  return v_category_id;
end;
$$;

grant execute on function public.create_menu_category(text) to authenticated;
revoke execute on function public.create_menu_category(text) from public, anon;
