-- Pick-up orders.
--
-- Customers can collect their own order instead of having it delivered. A
-- pick-up order carries no delivery fee, needs no address, never gets a
-- delivery record, so the completion guard has to let it finish without a
-- rider reporting "delivered".

-- 1. Every existing order is a delivery; new rows choose. The address becomes
--    nullable because a pick-up order has nowhere to be delivered — the
--    NOT NULL constraint would reject it before any of the logic below runs.
alter table public.orders
  add column if not exists order_type text not null default 'delivery';

alter table public.orders alter column delivery_address drop not null;

alter table public.orders drop constraint if exists orders_order_type_check;
alter table public.orders
  add constraint orders_order_type_check
  check (order_type in ('delivery', 'pickup'));

-- 2. place_order gains p_order_type. The signature changes, so the old one is
--    dropped first — otherwise Postgres keeps both as overloads and a call
--    with 11 arguments becomes ambiguous.
drop function if exists public.place_order(
  jsonb, text, text, text, text, text, timestamp with time zone, payment_method, text, text, text
);

create function public.place_order(
  p_cart jsonb,
  p_contact_name text,
  p_contact_phone text,
  p_delivery_address text,
  p_note_to_staff text,
  p_note_to_driver text,
  p_required_at timestamp with time zone,
  p_payment_method public.payment_method,
  p_gcash_sender_name text,
  p_gcash_number text,
  p_gcash_reference_number text,
  -- Defaulted so every existing caller keeps working untouched.
  p_order_type text default 'delivery'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := (select auth.uid());
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2);
  v_order_type text;
  v_item record;
  v_variant record;
begin
  if v_customer_id is null then raise exception 'Please sign in before placing an order.'; end if;
  if coalesce(p_order_type, 'delivery') not in ('delivery', 'pickup') then
    raise exception 'Choose delivery or pick up.';
  end if;
  v_order_type := coalesce(p_order_type, 'delivery');
  if jsonb_typeof(p_cart) <> 'array' or jsonb_array_length(p_cart) = 0 then raise exception 'Your cart is empty.'; end if;
  if v_order_type = 'delivery' and coalesce(trim(p_delivery_address), '') = '' then
    raise exception 'Enter a delivery address.';
  end if;

  if v_order_type = 'pickup' then
    -- Collecting in store: nobody delivers it, so there is no fee to charge.
    v_delivery_fee := 0;
  else
    select delivery_fee into v_delivery_fee from public.restaurant_settings where id = true;
    if v_delivery_fee is null then raise exception 'Delivery fee is not configured.'; end if;
  end if;

  for v_item in select variant_id, sum(quantity)::integer quantity from jsonb_to_recordset(p_cart) as x(variant_id uuid, quantity integer) group by variant_id loop
    if v_item.quantity <= 0 then raise exception 'Item quantity must be positive.'; end if;
    select mv.id, mv.name variant_name, mv.price, mi.name item_name, i.id inventory_id, i.current_stock, i.reserved_stock
    into v_variant from public.menu_variants mv join public.menu_items mi on mi.id = mv.menu_item_id
    join public.inventory i on i.menu_variant_id = mv.id
    where mv.id = v_item.variant_id and mv.is_active and mi.is_active for update of i;
    if not found then raise exception 'This item is no longer available.'; end if;
    if v_variant.current_stock - v_variant.reserved_stock < v_item.quantity then
      raise exception 'Only % serving(s) are currently available.', greatest(v_variant.current_stock - v_variant.reserved_stock, 0);
    end if;
    v_subtotal := v_subtotal + v_variant.price * v_item.quantity;
  end loop;

  insert into public.orders (
    customer_id, order_type, contact_name, contact_phone, delivery_address,
    note_to_staff, note_to_driver, required_at, subtotal, delivery_fee, total
  )
  values (
    v_customer_id,
    v_order_type,
    p_contact_name,
    p_contact_phone,
    case when v_order_type = 'pickup' then null else nullif(trim(p_delivery_address), '') end,
    nullif(p_note_to_staff, ''),
    case when v_order_type = 'pickup' then null else nullif(p_note_to_driver, '') end,
    p_required_at,
    v_subtotal,
    v_delivery_fee,
    v_subtotal + v_delivery_fee
  )
  returning id into v_order_id;

  for v_item in select variant_id, sum(quantity)::integer quantity from jsonb_to_recordset(p_cart) as x(variant_id uuid, quantity integer) group by variant_id loop
    select mv.name variant_name, mv.price, mi.name item_name, i.id inventory_id into v_variant
    from public.menu_variants mv join public.menu_items mi on mi.id = mv.menu_item_id join public.inventory i on i.menu_variant_id = mv.id where mv.id = v_item.variant_id;
    insert into public.order_items (order_id, menu_variant_id, item_name, variant_name, quantity, unit_price, subtotal)
    values (v_order_id, v_item.variant_id, v_variant.item_name, v_variant.variant_name, v_item.quantity, v_variant.price, v_variant.price * v_item.quantity);
    update public.inventory set reserved_stock = reserved_stock + v_item.quantity where id = v_variant.inventory_id;
    insert into public.inventory_movements (inventory_id, order_id, quantity, movement_type, performed_by)
    values (v_variant.inventory_id, v_order_id, v_item.quantity, 'reservation', v_customer_id);
  end loop;

  insert into public.payments (order_id, method, amount, gcash_sender_name, gcash_number, gcash_reference_number)
  values (v_order_id, p_payment_method, v_subtotal + v_delivery_fee,
    case when p_payment_method = 'gcash' then nullif(p_gcash_sender_name, '') end,
    case when p_payment_method = 'gcash' then nullif(p_gcash_number, '') end,
    case when p_payment_method = 'gcash' then nullif(p_gcash_reference_number, '') end);

  return v_order_id;
end;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default; this function must stay
-- reachable to signed-in customers only, the way it was before the drop.
-- Supabase's default privileges also hand EXECUTE to anon on new functions;
-- this one must stay signed-in only, exactly as the dropped function was.
revoke execute on function public.place_order(
  jsonb, text, text, text, text, text, timestamp with time zone, payment_method, text, text, text, text
) from public, anon;
grant execute on function public.place_order(
  jsonb, text, text, text, text, text, timestamp with time zone, payment_method, text, text, text, text
) to authenticated;

-- 3. update_order_status: a pick-up order has no delivery record at all, so
--    requiring "delivered" would make it impossible to ever complete.
--    Signature is unchanged, so CREATE OR REPLACE keeps the existing grants.
create or replace function public.update_order_status(p_order_id uuid, p_next_status public.order_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_order public.orders%rowtype; v_delivery_status public.delivery_status; v_item record;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can update order status.'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if p_next_status = 'cancelled' and v_order.status not in ('completed', 'cancelled') then
    update public.orders set status = 'cancelled' where id = p_order_id;
    for v_item in select oi.quantity, i.id inventory_id from public.order_items oi join public.inventory i on i.menu_variant_id = oi.menu_variant_id where oi.order_id = p_order_id loop
      update public.inventory set reserved_stock = reserved_stock - v_item.quantity where id = v_item.inventory_id;
      insert into public.inventory_movements (inventory_id, order_id, quantity, movement_type, performed_by) values (v_item.inventory_id, p_order_id, -v_item.quantity, 'release', (select auth.uid()));
    end loop;
    return;
  end if;
  if (v_order.status, p_next_status) not in (('pending','confirmed'), ('confirmed','preparing'), ('preparing','ready'), ('ready','completed')) then raise exception 'This order status change is not allowed.'; end if;
  if p_next_status = 'completed' then
    select status into v_delivery_status from public.deliveries where order_id = p_order_id;
    if v_order.order_type <> 'pickup' and v_delivery_status is distinct from 'delivered' then
      raise exception 'A delivery must be marked delivered before completion.';
    end if;
    for v_item in select oi.quantity, i.id inventory_id from public.order_items oi join public.inventory i on i.menu_variant_id = oi.menu_variant_id where oi.order_id = p_order_id loop
      update public.inventory set current_stock = current_stock - v_item.quantity, reserved_stock = reserved_stock - v_item.quantity where id = v_item.inventory_id;
      insert into public.inventory_movements (inventory_id, order_id, quantity, movement_type, performed_by) values (v_item.inventory_id, p_order_id, -v_item.quantity, 'completion', (select auth.uid()));
    end loop;
  end if;
  update public.orders set status = p_next_status where id = p_order_id;
end;
$$;
