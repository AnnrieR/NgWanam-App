create or replace function public.create_menu_variant(p_menu_item_id uuid, p_name text, p_serving_label text, p_price numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_variant_id uuid;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can create menu variants.'; end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_serving_label), '') is null or p_price < 0 then
    raise exception 'Variant name, serving label, and non-negative price are required.';
  end if;
  if not exists (select 1 from public.menu_items where id = p_menu_item_id) then raise exception 'Menu item not found.'; end if;
  insert into public.menu_variants (menu_item_id, name, serving_label, price)
  values (p_menu_item_id, trim(p_name), trim(p_serving_label), p_price)
  returning id into v_variant_id;
  insert into public.inventory (menu_variant_id) values (v_variant_id);
  return v_variant_id;
end;
$$;

grant execute on function public.create_menu_variant(uuid, text, text, numeric) to authenticated;
revoke execute on function public.create_menu_variant(uuid, text, text, numeric) from public, anon;
