-- Forward-only lifecycle change. Historical orders and stock are not rewritten.
alter table public.orders add column stock_deducted_at timestamptz;

create function private.deduct_order_stock_once(p_order_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype; v_item record;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_order.stock_deducted_at is not null then return; end if;
  if exists(select 1 from public.inventory_movements where order_id=p_order_id and movement_type='completion') then
    raise exception 'Stock history requires review before this order can be deducted.';
  end if;
  if exists(select 1 from public.order_items oi left join public.inventory i on i.menu_variant_id=oi.menu_variant_id where oi.order_id=p_order_id and i.id is null) then
    raise exception 'Order inventory is missing. Ask staff to review this order.';
  end if;
  for v_item in select oi.quantity,i.id,i.current_stock,i.reserved_stock from public.order_items oi
    join public.inventory i on i.menu_variant_id=oi.menu_variant_id where oi.order_id=p_order_id order by i.id for update of i loop
    if v_item.current_stock<v_item.quantity or v_item.reserved_stock<v_item.quantity then
      raise exception 'Reserved stock could not be confirmed. Ask staff to review this order.';
    end if;
    update public.inventory set current_stock=current_stock-v_item.quantity,reserved_stock=reserved_stock-v_item.quantity where id=v_item.id;
    insert into public.inventory_movements(inventory_id,order_id,quantity,movement_type,performed_by)
    values(v_item.id,p_order_id,-v_item.quantity,'completion',(select auth.uid()));
  end loop;
  update public.orders set stock_deducted_at=now() where id=p_order_id;
end $$;
revoke all on function private.deduct_order_stock_once(uuid) from public,anon,authenticated;

create or replace function public.update_delivery_status(p_delivery_id uuid,p_next_status public.delivery_status,p_proof_photo_path text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_delivery public.deliveries%rowtype; v_order public.orders%rowtype; v_order_id uuid;
begin
  if not exists(select 1 from public.profiles where id=(select auth.uid()) and role='delivery' and is_active) then raise exception 'Only active delivery users can update deliveries.'; end if;
  select order_id into v_order_id from public.deliveries where id=p_delivery_id and assigned_to=(select auth.uid());
  if not found then raise exception 'Delivery not found.'; end if;
  -- All paths lock order, delivery, then inventory, avoiding cancellation races.
  select * into v_order from public.orders where id=v_order_id for update;
  select * into v_delivery from public.deliveries where id=p_delivery_id and assigned_to=(select auth.uid()) for update;
  if v_order.status<>'ready' or v_order.order_type<>'delivery' then raise exception 'This order is no longer active for delivery.'; end if;
  if p_next_status is null or (v_delivery.status,p_next_status) not in (('assigned','out_for_delivery'),('out_for_delivery','delivered')) then raise exception 'This delivery status change is not allowed.'; end if;
  if p_next_status='delivered' then
    if p_proof_photo_path is null or not exists(select 1 from storage.objects where bucket_id='delivery-proofs' and name=p_proof_photo_path
      and (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2]=p_delivery_id::text) then
      raise exception 'Upload a proof-of-delivery photo before marking delivered.';
    end if;
    perform private.deduct_order_stock_once(v_order_id);
  end if;
  update public.deliveries set status=p_next_status,
    out_for_delivery_at=case when p_next_status='out_for_delivery' then now() else out_for_delivery_at end,
    delivered_at=case when p_next_status='delivered' then now() else delivered_at end,
    proof_photo_path=case when p_next_status='delivered' then p_proof_photo_path else proof_photo_path end where id=p_delivery_id;
end $$;

create or replace function public.update_order_status(p_order_id uuid,p_next_status public.order_status)
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype; v_delivery_status public.delivery_status; v_item record;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can update order status.'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  select status into v_delivery_status from public.deliveries where order_id=p_order_id;
  if p_next_status='cancelled' and v_order.status not in('completed','cancelled') then
    if v_order.stock_deducted_at is not null or v_delivery_status='delivered' then raise exception 'Delivered orders cannot be cancelled. Ask staff to review any return or refund separately.'; end if;
    update public.orders set status='cancelled' where id=p_order_id;
    for v_item in select oi.quantity,i.id inventory_id from public.order_items oi join public.inventory i on i.menu_variant_id=oi.menu_variant_id where oi.order_id=p_order_id order by i.id loop
      update public.inventory set reserved_stock=reserved_stock-v_item.quantity where id=v_item.inventory_id;
      insert into public.inventory_movements(inventory_id,order_id,quantity,movement_type,performed_by) values(v_item.inventory_id,p_order_id,-v_item.quantity,'release',(select auth.uid()));
    end loop;
    return;
  end if;
  if p_next_status is null or (v_order.status,p_next_status) not in (('pending','confirmed'),('confirmed','preparing'),('preparing','ready'),('ready','completed')) then raise exception 'This order status change is not allowed.'; end if;
  if p_next_status='completed' then
    if v_order.order_type<>'pickup' and v_delivery_status is distinct from 'delivered' then raise exception 'A delivery must be marked delivered before completion.'; end if;
    -- New deliveries have already deducted stock. Pick-up (and a legacy delivery
    -- marked Delivered before this migration) still deduct once here if needed.
    if v_order.stock_deducted_at is null then perform private.deduct_order_stock_once(p_order_id); end if;
  end if;
  update public.orders set status=p_next_status where id=p_order_id;
end $$;
