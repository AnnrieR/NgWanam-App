create or replace function public.create_menu_entry(
  p_category_id uuid, p_item_name text, p_description text, p_image_url text,
  p_is_best_seller boolean, p_requires_preorder boolean, p_variant_name text,
  p_serving_label text, p_price numeric
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_item_id uuid; v_variant_id uuid;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can create menu entries.'; end if;
  if nullif(trim(p_item_name), '') is null or nullif(trim(p_variant_name), '') is null or nullif(trim(p_serving_label), '') is null or p_price < 0 then
    raise exception 'Menu item, variant, serving label, and non-negative price are required.';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then raise exception 'Category not found.'; end if;
  insert into public.menu_items (category_id, name, description, image_url, is_best_seller, requires_preorder)
  values (p_category_id, trim(p_item_name), nullif(trim(p_description), ''), nullif(trim(p_image_url), ''), p_is_best_seller, p_requires_preorder)
  returning id into v_item_id;
  insert into public.menu_variants (menu_item_id, name, serving_label, price)
  values (v_item_id, trim(p_variant_name), trim(p_serving_label), p_price)
  returning id into v_variant_id;
  insert into public.inventory (menu_variant_id) values (v_variant_id);
  return v_variant_id;
end;
$$;

grant execute on function public.create_menu_entry(uuid, text, text, text, boolean, boolean, text, text, numeric) to authenticated;
revoke execute on function public.create_menu_entry(uuid, text, text, text, boolean, boolean, text, text, numeric) from public, anon;
