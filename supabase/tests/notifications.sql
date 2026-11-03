-- All fixtures and notifications roll back; no historical alert backfill.
begin;
create temporary table notification_fixture(order_id uuid,delivery_id uuid);
grant select on notification_fixture to authenticated;
do $$
declare o uuid; d uuid; n integer;
begin
  insert into public.orders(customer_id,status,order_type,contact_name,contact_phone,delivery_address,subtotal,delivery_fee,total)
  values('10000000-0000-0000-0000-000000000005','pending','delivery','ROLLBACK ALERT CHECK','09000000000','Test',10,0,10) returning id into o;
  if (select count(*) from public.notifications where order_id=o and kind='order_placed')<>(select count(*) from public.profiles where is_active and role in ('staff','admin')) then raise exception 'New order did not reach each active operator'; end if;
  if exists(select 1 from public.notifications where order_id=o and recipient_role in('customer','delivery')) then raise exception 'New order broadcast too widely'; end if;
  update public.orders set status='confirmed' where id=o;
  select count(*) into n from public.notifications where order_id=o;
  update public.orders set status='confirmed' where id=o;
  if (select count(*) from public.notifications where order_id=o)<>n then raise exception 'Repeated status duplicated notification'; end if;
  update public.orders set status='ready' where id=o;
  insert into public.deliveries(order_id,assigned_to,status) values(o,'10000000-0000-0000-0000-000000000004','assigned') returning id into d;
  insert into notification_fixture values(o,d);
  if (select count(*) from public.notifications where order_id=o and kind='delivery_assigned')<>2 then raise exception 'Assignment must reach customer and rider'; end if;
  update public.deliveries set status='out_for_delivery' where id=d;
  if not exists(select 1 from public.notifications where order_id=o and kind='delivery_out_for_delivery' and recipient_id='10000000-0000-0000-0000-000000000005') then raise exception 'Customer missing departure alert'; end if;
  update public.deliveries set status='delivered',delivered_at=now() where id=d;
  if (select count(*) from public.notifications where order_id=o and kind='delivery_delivered')<>1+(select count(*) from public.profiles where is_active and role in('staff','admin')) then raise exception 'Delivered must reach customer and operations'; end if;
  update public.orders set status='cancelled' where id=o;
  if not exists(select 1 from public.notifications where order_id=o and kind='order_cancelled' and recipient_role='delivery') then raise exception 'Rider missing cancellation warning'; end if;
  if has_table_privilege('authenticated','public.notifications','INSERT') or has_table_privilege('authenticated','public.notifications','UPDATE') or has_table_privilege('authenticated','public.notifications','DELETE') then raise exception 'Client direct writes allowed'; end if;
  if has_function_privilege('anon','public.mark_notifications_read(uuid)','EXECUTE') then raise exception 'Anon read mutation allowed'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then raise exception 'Realtime missing'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
set local role authenticated;
do $$
declare id_to_read uuid;
begin
  if exists(select 1 from public.notifications where recipient_id<>(select auth.uid())) then raise exception 'Foreign alerts leaked'; end if;
  select id into id_to_read from public.notifications where order_id=(select order_id from notification_fixture) limit 1;
  perform public.mark_notifications_read(id_to_read);
  if not exists(select 1 from public.notifications where id=id_to_read and read_at is not null) then raise exception 'Single read failed'; end if;
  perform public.mark_notifications_read();
  if exists(select 1 from public.notifications where read_at is null) then raise exception 'Mark all failed'; end if;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.notifications where order_id=(select order_id from notification_fixture) and recipient_role<>'customer' and read_at is not null) then raise exception 'Read changed another recipient'; end if;
  -- Attempt a real foreign alert ID, not just a nonexistent ID.
  perform set_config('test.foreign_alert',(select id::text from public.notifications where order_id=(select order_id from notification_fixture) and recipient_role='delivery' limit 1),true);
end $$;
set local role authenticated;
select public.mark_notifications_read(current_setting('test.foreign_alert')::uuid);
reset role;
do $$ begin
  if exists(select 1 from public.notifications where id=current_setting('test.foreign_alert')::uuid and read_at is not null) then raise exception 'Foreign ID marked read'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.notifications where recipient_role<>'delivery') then raise exception 'Rider sees foreign role alerts'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
update public.profiles set is_active=false where id='10000000-0000-0000-0000-000000000004';
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.notifications) then raise exception 'Inactive user sees alerts'; end if;
  begin perform public.mark_notifications_read(); raise exception 'Inactive user marked alerts';
  exception when raise_exception then if sqlerrm not like 'An active account%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.notifications where recipient_id<>(select auth.uid())) then raise exception 'Admin can read other recipients'; end if;
end $$;
reset role;
update public.profiles set is_active=true,role='staff' where id='10000000-0000-0000-0000-000000000004';
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.notifications where order_id=(select order_id from notification_fixture)) then raise exception 'Role-changed user sees old role alerts'; end if;
  perform public.mark_notifications_read();
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.notifications where order_id=(select order_id from notification_fixture) and recipient_role='delivery' and read_at is not null) then raise exception 'Role change marked hidden role alerts read'; end if;
end $$;
do $$ begin raise notice 'PASS event recipients, duplicate-status protection, customer/rider RLS, single/all read, foreign-ID isolation, inactive/anon/direct-write denial and Realtime'; end $$;
rollback;
