-- Remove only the former October daily generator's distinctive fingerprint.
-- Do not delete every order owned by Test Customer: manually placed orders use
-- the same account. This is an incremental cleanup, NOT a database reset.
do $$
declare removed integer;
begin
  lock table public.orders, public.order_items, public.payments,
    public.deliveries, public.inventory, public.inventory_movements
    in share row exclusive mode;

  create temporary table daily_demo_orders_to_remove on commit drop as
  select o.id from public.orders o
  where o.customer_id='10000000-0000-0000-0000-000000000005'::uuid
    and o.created_at>='2026-10-01 00:00:00+08'::timestamptz
    and o.created_at<'2026-11-01 00:00:00+08'::timestamptz
    and o.order_type='delivery'
    and o.contact_name=any(array['Juan Dela Cruz','Ana Reyes','Mark Jacob','Liza Macapagal',
      'Rodel Fernandez','Kevin Tan','Mariel Quinones','Patricia Santos'])
    -- The generator made 12-digit fake phone numbers, not real PH mobiles.
    and o.contact_phone ~ '^090[1-9][0-9]{8}$'
    and o.delivery_address ~ '^Barangay ([1-9]|1[0-9]|2[0-4]), Batangas City$'
    and o.note_to_staff is null and o.note_to_driver is null and o.required_at is null
    and o.delivery_fee=50
    and o.created_at=date_trunc('second',o.created_at)
    and (o.created_at at time zone 'Asia/Manila')::time >= time '09:00'
    and (o.created_at at time zone 'Asia/Manila')::time < time '18:00'
    and (select count(*) from public.order_items oi where oi.order_id=o.id)=1
    and exists(select 1 from public.order_items oi where oi.order_id=o.id
      and oi.quantity between 1 and 3 and oi.subtotal=o.subtotal)
    and exists(select 1 from public.payments p where p.order_id=o.id
      and p.created_at=o.created_at and p.amount=o.total)
    -- A later real proof upload makes the row ambiguous: retain it for review.
    and not exists(select 1 from public.deliveries d where d.order_id=o.id and d.proof_photo_path is not null);

  create temporary table daily_demo_affected_inventory on commit drop as
    select distinct i.id from public.inventory i join public.order_items oi on oi.menu_variant_id=i.menu_variant_id
    join daily_demo_orders_to_remove s on s.id=oi.order_id;

  -- Clear only activity tied directly to the generated transactions.
  delete from public.activity_logs a where
    (a.record_type='orders' and a.record_id in(select id from daily_demo_orders_to_remove))
    or (a.record_type='payments' and a.record_id in(select p.id from public.payments p join daily_demo_orders_to_remove s on s.id=p.order_id))
    or (a.record_type='deliveries' and a.record_id in(select d.id from public.deliveries d join daily_demo_orders_to_remove s on s.id=d.order_id));
  -- Movements have a non-cascading order FK. Retain movements for other orders.
  delete from public.inventory_movements where order_id in(select id from daily_demo_orders_to_remove);
  -- Order items, payments and deliveries cascade from these exact order IDs.
  delete from public.orders where id in(select id from daily_demo_orders_to_remove);
  get diagnostics removed=row_count;

  -- Release demo reservations only; never replenish or deduct on-hand stock.
  update public.inventory i set reserved_stock=coalesce((
    select sum(oi.quantity)::integer from public.order_items oi join public.orders o on o.id=oi.order_id
    where oi.menu_variant_id=i.menu_variant_id and o.status in ('pending','confirmed','preparing','ready')
  ),0) where i.id in(select id from daily_demo_affected_inventory)
    and i.reserved_stock is distinct from coalesce((
      select sum(oi.quantity)::integer from public.order_items oi join public.orders o on o.id=oi.order_id
      where oi.menu_variant_id=i.menu_variant_id and o.status in ('pending','confirmed','preparing','ready')
    ),0);
  raise notice 'Removed % daily demo orders; manually placed orders and on-hand stock retained.',removed;
end $$;
