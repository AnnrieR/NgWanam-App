create or replace function public.assign_delivery(p_order_id uuid, p_delivery_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can assign deliveries.'; end if;
  if not exists (select 1 from public.orders where id = p_order_id and status = 'ready') then
    raise exception 'Only ready orders can be assigned for delivery.';
  end if;
  if not exists (select 1 from public.profiles where id = p_delivery_user_id and role = 'delivery' and is_active) then
    raise exception 'Delivery assignee must be an active delivery user.';
  end if;
  insert into public.deliveries (order_id, assigned_to, status, assigned_at)
  values (p_order_id, p_delivery_user_id, 'assigned', now());
exception when unique_violation then
  raise exception 'This order is already assigned for delivery.';
end;
$$;

create or replace function public.update_delivery_status(p_delivery_id uuid, p_next_status public.delivery_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_status public.delivery_status;
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'delivery' and is_active) then
    raise exception 'Only active delivery users can update deliveries.';
  end if;
  select status into v_status from public.deliveries where id = p_delivery_id and assigned_to = (select auth.uid()) for update;
  if not found then raise exception 'Delivery not found.'; end if;
  if (v_status, p_next_status) not in (('assigned', 'out_for_delivery'), ('out_for_delivery', 'delivered')) then
    raise exception 'This delivery status change is not allowed.';
  end if;
  update public.deliveries set status = p_next_status,
    out_for_delivery_at = case when p_next_status = 'out_for_delivery' then now() else out_for_delivery_at end,
    delivered_at = case when p_next_status = 'delivered' then now() else delivered_at end
  where id = p_delivery_id;
end;
$$;

grant execute on function public.assign_delivery(uuid, uuid) to authenticated;
grant execute on function public.update_delivery_status(uuid, public.delivery_status) to authenticated;
revoke execute on function public.assign_delivery(uuid, uuid) from public, anon;
revoke execute on function public.update_delivery_status(uuid, public.delivery_status) from public, anon;

drop policy "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders for select to authenticated using (
  (select auth.uid()) = customer_id
  or (select private.is_staff_or_admin())
  or exists (select 1 from public.deliveries d where d.order_id = public.orders.id and d.assigned_to = (select auth.uid()))
);
