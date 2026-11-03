-- Reconcile the demo's open orders without replenishing on-hand stock or
-- changing order status. Historical completed/cancelled orders stay untouched.
do $$
begin
  -- One DO statement is one transaction even when the CLI runs statements
  -- individually. Keep the lock, checks and reconciliation in that statement.
  lock table public.orders, public.order_items, public.inventory, public.inventory_movements in share row exclusive mode;
  if exists (
    select 1 from public.order_items oi join public.orders o on o.id=oi.order_id
    left join public.inventory i on i.menu_variant_id=oi.menu_variant_id
    where o.status in ('pending','confirmed','preparing','ready') and i.id is null
  ) then raise exception 'Open order has no inventory row; resolve before reconciliation.'; end if;
  if exists (
    select 1 from public.inventory i join (
      select oi.menu_variant_id,sum(oi.quantity) quantity from public.order_items oi
      join public.orders o on o.id=oi.order_id
      where o.status in ('pending','confirmed','preparing','ready') group by oi.menu_variant_id
    ) x on x.menu_variant_id=i.menu_variant_id where x.quantity>i.current_stock
  ) then raise exception 'Insufficient on-hand stock; do not silently replenish demo stock.'; end if;

insert into public.inventory_movements(inventory_id,order_id,quantity,movement_type,performed_by)
select x.inventory_id,x.order_id,(x.quantity-coalesce(m.quantity,0))::integer,
  case when x.quantity>coalesce(m.quantity,0) then 'reservation'::public.inventory_movement_type else 'release'::public.inventory_movement_type end,null
from (
  select i.id inventory_id,o.id order_id,sum(oi.quantity) quantity
  from public.orders o join public.order_items oi on oi.order_id=o.id
  join public.inventory i on i.menu_variant_id=oi.menu_variant_id
  where o.status in ('pending','confirmed','preparing','ready') group by i.id,o.id
) x left join (
  select inventory_id,order_id,sum(quantity) quantity from public.inventory_movements group by inventory_id,order_id
) m on m.inventory_id=x.inventory_id and m.order_id=x.order_id
where x.quantity<>coalesce(m.quantity,0);

update public.inventory i set reserved_stock=coalesce((
  select sum(oi.quantity)::integer from public.order_items oi join public.orders o on o.id=oi.order_id
  where oi.menu_variant_id=i.menu_variant_id and o.status in ('pending','confirmed','preparing','ready')
),0) where i.reserved_stock is distinct from coalesce((
  select sum(oi.quantity)::integer from public.order_items oi join public.orders o on o.id=oi.order_id
  where oi.menu_variant_id=i.menu_variant_id and o.status in ('pending','confirmed','preparing','ready')
),0);
end $$;
