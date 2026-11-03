create or replace function public.cancel_own_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_item record;
begin
  if v_customer_id is null then raise exception 'Please sign in before cancelling an order.'; end if;
  select * into v_order from public.orders
  where id = p_order_id and customer_id = v_customer_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_order.status not in ('pending', 'confirmed') then
    raise exception 'This order can no longer be cancelled.';
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;
  for v_item in select oi.quantity, i.id inventory_id
    from public.order_items oi join public.inventory i on i.menu_variant_id = oi.menu_variant_id
    where oi.order_id = p_order_id loop
    update public.inventory set reserved_stock = reserved_stock - v_item.quantity where id = v_item.inventory_id;
    insert into public.inventory_movements (inventory_id, order_id, quantity, movement_type, performed_by)
    values (v_item.inventory_id, p_order_id, -v_item.quantity, 'release', v_customer_id);
  end loop;
end;
$$;

grant execute on function public.cancel_own_order(uuid) to authenticated;
revoke execute on function public.cancel_own_order(uuid) from public, anon;
