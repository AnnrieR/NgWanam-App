-- Forward-only: proof becomes optional. Keep rider ownership, lifecycle locks,
-- reservation validation and the existing one-time stock deduction unchanged.
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
    -- A supplied image must still belong to this rider and this delivery.
    if p_proof_photo_path is not null and not exists(select 1 from storage.objects where bucket_id='delivery-proofs' and name=p_proof_photo_path
      and (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2]=p_delivery_id::text) then
      raise exception 'The supplied proof-of-delivery photo is invalid.';
    end if;
    perform private.deduct_order_stock_once(v_order_id);
  end if;
  update public.deliveries set status=p_next_status,
    out_for_delivery_at=case when p_next_status='out_for_delivery' then now() else out_for_delivery_at end,
    delivered_at=case when p_next_status='delivered' then now() else delivered_at end,
    proof_photo_path=case when p_next_status='delivered' then coalesce(p_proof_photo_path,proof_photo_path) else proof_photo_path end where id=p_delivery_id;
end $$;

-- Replacing a function retains its existing ACL. Do not grant new access.
-- No historical deliveries, proof objects, orders, payments or stock are rewritten.
