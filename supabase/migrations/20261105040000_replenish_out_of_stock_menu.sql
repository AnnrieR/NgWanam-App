-- Standardize inventory alerts and replenish active menu servings that are
-- currently unavailable. Keep enough on-hand stock for any reservations that
-- may already exist so the inventory check constraint remains valid.
update public.inventory
set current_stock = greatest(current_stock, 15, reserved_stock),
    minimum_stock = 5
where exists (
  select 1
  from public.menu_variants mv
  join public.menu_items mi on mi.id = mv.menu_item_id
  where mv.id = public.inventory.menu_variant_id
    and mv.is_active
    and mi.is_active
    and public.inventory.current_stock - public.inventory.reserved_stock <= 0
);

-- Every inventory record, including inactive historical servings, uses the
-- same alert threshold going forward.
update public.inventory
set minimum_stock = 5
where minimum_stock is distinct from 5;
