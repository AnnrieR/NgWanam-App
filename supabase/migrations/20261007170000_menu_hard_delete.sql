-- The Menu tab is now a CRUD table with a real delete, and "delete" has to
-- mean the menu item actually goes away. Two things are in the way:
--
-- 1. `order_items.menu_variant_id` is ON DELETE CASCADE today, so removing a
--    variant would silently delete the order lines that reference it (246 of
--    them). The order row already stores item_name, variant_name and unit_price
--    at checkout, so nothing of the receipt depends on the pointer - only the
--    link does. Pointing it at SET NULL keeps the history and drops the link.
--
-- 2. `menu_variants -> menu_items` and `inventory -> menu_variants` are both
--    NO ACTION, so the children have to be removed first, in order.

do $$
declare existing text;
begin
  select conname into existing
    from pg_constraint
   where contype = 'f'
     and conrelid = 'public.order_items'::regclass
     and confrelid = 'public.menu_variants'::regclass;

  if existing is not null then
    execute format('alter table public.order_items drop constraint %I', existing);
  end if;

  alter table public.order_items
    add constraint order_items_menu_variant_id_fkey
    foreign key (menu_variant_id)
    references public.menu_variants (id)
    on delete set null;
end $$;

-- One statement so a failed delete can never leave a half-removed item
-- (variants with no inventory, or an item with no variants) behind.
create or replace function public.delete_menu_item(p_menu_item_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff_or_admin() then
    raise exception 'Only staff can delete menu entries.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.menu_items where id = p_menu_item_id) then
    raise exception 'Menu item not found.';
  end if;

  delete from public.inventory
   where menu_variant_id in (
     select id from public.menu_variants where menu_item_id = p_menu_item_id
   );

  delete from public.menu_variants where menu_item_id = p_menu_item_id;

  delete from public.menu_items where id = p_menu_item_id;
end;
$$;

-- `create or replace` hands anon an implicit EXECUTE; this was never meant for
-- an unauthenticated caller, so take it back.
revoke execute on function public.delete_menu_item(uuid) from public, anon;
grant execute on function public.delete_menu_item(uuid) to authenticated;
