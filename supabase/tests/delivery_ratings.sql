-- Rollback-only: existing orders, payments and stock are never modified.
begin;
create temporary table rating_fixture(order_id uuid, delivery_id uuid);
grant select on rating_fixture to authenticated;
do $$
declare o uuid; d uuid;
begin
 insert into public.orders(customer_id,status,order_type,contact_name,contact_phone,delivery_address,subtotal,delivery_fee,total)
 values('10000000-0000-0000-0000-000000000005','ready','delivery','ROLLBACK RATING CHECK','09000000000','Test',10,0,10) returning id into o;
 insert into public.deliveries(order_id,assigned_to,status) values(o,'10000000-0000-0000-0000-000000000004','assigned') returning id into d;
 insert into rating_fixture values(o,d);
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
 begin
  perform public.submit_delivery_rating(o,5,'Too early'); raise exception 'Undelivered rating accepted';
 exception when raise_exception then if sqlerrm not like 'Only your own successfully%' then raise; end if; end;
 update public.deliveries set status='delivered',delivered_at=now() where id=d;
 update public.orders set status='cancelled' where id=o;
 begin
  perform public.submit_delivery_rating(o,5,null); raise exception 'Cancelled rating accepted';
 exception when raise_exception then if sqlerrm not like 'Only your own successfully%' then raise; end if; end;
 update public.orders set status='ready' where id=o;
 update public.orders set customer_id='10000000-0000-0000-0000-000000000001' where id=o;
 begin
  perform public.submit_delivery_rating(o,5,null); raise exception 'Other customer order accepted';
 exception when raise_exception then if sqlerrm not like 'Only your own successfully%' then raise; end if; end;
 if exists(select 1 from public.get_delivery_rating_context(o)) then raise exception 'Foreign order context leaked'; end if;
 update public.orders set customer_id='10000000-0000-0000-0000-000000000005' where id=o;
 foreach o in array array[(select order_id from rating_fixture)] loop
  begin
   perform public.submit_delivery_rating(o,0,null); raise exception 'Invalid stars accepted';
  exception when raise_exception then if sqlerrm not like 'Choose a whole-number%' then raise; end if; end;
  begin
   perform public.submit_delivery_rating(o,5,repeat('x',501)); raise exception 'Long comment accepted';
  exception when raise_exception then if sqlerrm not like 'Comment must%' then raise; end if; end;
 end loop;
 if has_function_privilege('anon','public.submit_delivery_rating(uuid,integer,text)','EXECUTE') then raise exception 'Anon can rate'; end if;
 if has_table_privilege('authenticated','public.delivery_ratings','INSERT') or has_table_privilege('authenticated','public.delivery_ratings','UPDATE') or has_table_privilege('authenticated','public.delivery_ratings','DELETE') then raise exception 'Direct writes permitted'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin
  perform public.submit_delivery_rating((select order_id from rating_fixture),5,null); raise exception 'Staff rating accepted';
 exception when raise_exception then if sqlerrm not like 'Only an active customer%' then raise; end if; end;
end $$;
reset role;
-- A second customer cannot submit/read another customer's context.
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin
  perform public.submit_delivery_rating(gen_random_uuid(),5,null); raise exception 'Foreign order accepted';
 exception when raise_exception then if sqlerrm not like 'Only your own successfully%' then raise; end if; end;
 perform public.submit_delivery_rating((select order_id from rating_fixture),4,'  Good delivery  ');
 if not exists(select 1 from public.delivery_ratings where delivery_id=(select delivery_id from rating_fixture) and rating=4 and comment='Good delivery') then raise exception 'Customer cannot read own saved rating'; end if;
 begin
  perform public.submit_delivery_rating((select order_id from rating_fixture),1,null); raise exception 'Duplicate accepted';
 exception when raise_exception then if sqlerrm not like 'This delivery has already%' then raise; end if; end;
 if not exists(select 1 from public.get_delivery_rating_context((select order_id from rating_fixture)) where rating=4 and not can_rate) then raise exception 'Context mismatch'; end if;
 begin
  perform public.get_rider_rating_summaries(); raise exception 'Customer summary accepted';
 exception when raise_exception then if sqlerrm not like 'Rider ratings are available%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.get_rider_rating_summaries() where rider_id='10000000-0000-0000-0000-000000000004' and rating_count>=1) then raise exception 'Missing rider summary'; end if;
 if exists(select 1 from public.get_rider_rating_summaries() where rider_id<> '10000000-0000-0000-0000-000000000004') then raise exception 'Other rider summary leaked'; end if;
 if not exists(select 1 from public.delivery_ratings where delivery_id=(select delivery_id from rating_fixture)) then raise exception 'Rider cannot read own feedback'; end if;
end $$;
reset role;
do $$ begin raise notice 'PASS delivered-only, ownership, roles, stars, length, duplicate, direct-write and anon guards; customer context and rider summary/RLS'; end $$;
rollback;
