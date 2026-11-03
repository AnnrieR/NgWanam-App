alter table public.orders add column completed_at timestamptz;
alter table public.deliveries add column proof_photo_path text;

create function private.stamp_order_completion() returns trigger language plpgsql set search_path='' as $$
begin
  if new.status='completed' and old.status is distinct from new.status then new.completed_at:=now(); end if;
  return new;
end $$;
create trigger stamp_order_completion before update of status on public.orders for each row execute function private.stamp_order_completion();
-- Only use real recorded milestones, never creation time as completion time.
update public.orders o set completed_at=(select min(created_at) from public.activity_logs where record_type='orders' and record_id=o.id and action='order_status:completed') where o.status='completed';

-- Preserve the existing atomic reservation/completion logic; tighten its
-- ordering entry point without introducing a payment gate.
do $$
declare definition text; changed text;
begin
  definition:=pg_get_functiondef('public.place_order(jsonb,text,text,text,text,text,timestamptz,public.payment_method,text,text,text,text)'::regprocedure);
  changed:=replace(definition,
    'if v_customer_id is null then raise exception ''Please sign in before placing an order.''; end if;',
    'if not exists(select 1 from public.profiles where id=v_customer_id and role=''customer'' and is_active) then raise exception ''Only active customers can place orders.''; end if;');
  if changed=definition then raise exception 'Ordering role guard anchor missing.'; end if;
  definition:=changed;
  changed:=replace(definition,'mv.is_active and mi.is_active for update of i','mv.is_active and mi.is_active and mi.approval_status=''approved'' for update of i');
  if changed=definition then raise exception 'Ordering approval guard anchor missing.'; end if;
  execute changed;
end $$;

create or replace function public.assign_delivery(p_order_id uuid,p_delivery_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype;
begin
  if not private.is_staff_or_admin() then raise exception 'Only staff can assign deliveries.'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.status<>'ready' or v_order.order_type<>'delivery' then raise exception 'Only ready delivery orders can be assigned.'; end if;
  if not exists(select 1 from public.profiles where id=p_delivery_user_id and role='delivery' and is_active) then raise exception 'Delivery assignee must be an active delivery user.'; end if;
  insert into public.deliveries(order_id,assigned_to,status,assigned_at) values(p_order_id,p_delivery_user_id,'assigned',now());
exception when unique_violation then raise exception 'This order is already assigned for delivery.';
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('delivery-proofs','delivery-proofs',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy "accessible delivery proof photos" on storage.objects for select to authenticated using (
  bucket_id='delivery-proofs' and exists(select 1 from public.deliveries d where d.id::text=(storage.foldername(name))[2] and private.can_access_order(d.order_id))
);
create policy "assigned riders upload delivery proof" on storage.objects for insert to authenticated with check (
  bucket_id='delivery-proofs' and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.deliveries d join public.orders o on o.id=d.order_id
    join public.profiles p on p.id=d.assigned_to where d.id::text=(storage.foldername(name))[2]
    and d.assigned_to=auth.uid() and p.role='delivery' and p.is_active
    and d.status='out_for_delivery' and o.status='ready' and o.order_type='delivery')
);
create policy "riders clean unused delivery uploads" on storage.objects for delete to authenticated using (
  bucket_id='delivery-proofs' and (storage.foldername(name))[1]=auth.uid()::text
  and not exists(select 1 from public.deliveries d where d.proof_photo_path=name)
);

drop function public.update_delivery_status(uuid,public.delivery_status);
create function public.update_delivery_status(p_delivery_id uuid,p_next_status public.delivery_status,p_proof_photo_path text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_delivery public.deliveries%rowtype; v_order public.orders%rowtype; v_order_id uuid;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='delivery' and is_active) then raise exception 'Only active delivery users can update deliveries.'; end if;
  select order_id into v_order_id from public.deliveries where id=p_delivery_id and assigned_to=auth.uid();
  if not found then raise exception 'Delivery not found.'; end if;
  -- Same lock order as staff cancellation/completion, so cancellation cannot
  -- race a rider's progress update.
  select * into v_order from public.orders where id=v_order_id for update;
  select * into v_delivery from public.deliveries where id=p_delivery_id and assigned_to=auth.uid() for update;
  if v_order.status<>'ready' or v_order.order_type<>'delivery' then raise exception 'This order is no longer active for delivery.'; end if;
  if (v_delivery.status,p_next_status) not in (('assigned','out_for_delivery'),('out_for_delivery','delivered')) then raise exception 'This delivery status change is not allowed.'; end if;
  if p_next_status='delivered' and (p_proof_photo_path is null or not exists(
    select 1 from storage.objects where bucket_id='delivery-proofs' and name=p_proof_photo_path
      and (storage.foldername(name))[1]=auth.uid()::text and (storage.foldername(name))[2]=p_delivery_id::text
  )) then raise exception 'Upload a proof-of-delivery photo before marking delivered.'; end if;
  update public.deliveries set status=p_next_status,
    out_for_delivery_at=case when p_next_status='out_for_delivery' then now() else out_for_delivery_at end,
    delivered_at=case when p_next_status='delivered' then now() else delivered_at end,
    proof_photo_path=case when p_next_status='delivered' then p_proof_photo_path else proof_photo_path end where id=p_delivery_id;
end $$;
revoke execute on function public.update_delivery_status(uuid,public.delivery_status,text) from public,anon;
grant execute on function public.update_delivery_status(uuid,public.delivery_status,text) to authenticated;
