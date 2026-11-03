-- Removing stock used by unfinished orders would prevent their completion.
create or replace function public.delete_menu_item(p_menu_item_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff_or_admin() then
    raise exception 'Only staff can delete menu entries.' using errcode = '42501';
  end if;
  perform 1 from public.menu_items where id = p_menu_item_id for update;
  if not found then raise exception 'Menu item not found.'; end if;
  if exists (
    select 1 from public.order_items oi
    join public.menu_variants mv on mv.id = oi.menu_variant_id
    join public.orders o on o.id = oi.order_id
    where mv.menu_item_id = p_menu_item_id
      and o.status not in ('completed', 'cancelled')
  ) or exists (
    select 1 from public.inventory i
    join public.menu_variants mv on mv.id = i.menu_variant_id
    where mv.menu_item_id = p_menu_item_id and i.reserved_stock > 0
  ) then
    raise exception 'This item has unfinished orders. Complete or cancel them before deleting it.';
  end if;
  delete from public.inventory where menu_variant_id in (
    select id from public.menu_variants where menu_item_id = p_menu_item_id
  );
  delete from public.menu_variants where menu_item_id = p_menu_item_id;
  delete from public.menu_items where id = p_menu_item_id;
end;
$$;
revoke execute on function public.delete_menu_item(uuid) from public, anon;
grant execute on function public.delete_menu_item(uuid) to authenticated;
