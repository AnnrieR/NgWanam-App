-- Transaction-only fixtures: stock, catalog rates, orders and alerts roll back.
begin;
-- Payment destinations must now be configured explicitly; fixtures roll back.
update public.restaurant_settings set gcash_account_name='Rollback fee-test wallet',gcash_account_number='09123456789',gcash_enabled=true where id=true;
create temporary table fee_fixture(variant_id uuid,inventory_id uuid);
grant select on fee_fixture to authenticated;
do $$ declare item uuid; variant uuid; stock uuid; begin
  insert into public.menu_items(category_id,name) values((select id from public.categories limit 1),'ROLLBACK DELIVERY FEE CHECK') returning id into item;
  insert into public.menu_variants(menu_item_id,name,serving_label,price) values(item,'Regular','Test',100) returning id into variant;
  insert into public.inventory(menu_variant_id,current_stock) values(variant,100) returning id into stock;
  insert into fee_fixture values(variant,stock);
   if (select count(*) from public.delivery_areas where name in('Camella Solomiente','Greenwoods Phase 1','Greenwoods Subd.','Nangkaan, San Pascual') and fee=150)<>4 then raise exception 'Confirmed 150 rate missing'; end if;
   if not exists(select 1 from public.delivery_areas where name='Bauan / Aplaya' and fee=150 and is_active)
     or exists(select 1 from public.delivery_areas where name='Bauan Biayan / Aplaya') then raise exception 'Bauan name correction missing'; end if;
  if not exists(select 1 from public.delivery_areas where name='Mahabang Dahilig' and fee=250) then raise exception 'Confirmed 250 rate missing'; end if;
   -- Admin CRUD now has table grants; role-specific authorization is enforced by RLS
   -- and covered by admin_delivery_areas.sql / delete_delivery_areas.sql.
   if not (select relrowsecurity from pg_class where oid='public.delivery_areas'::regclass) then raise exception 'Area RLS missing'; end if;
  if has_table_privilege('anon','public.delivery_areas','SELECT') or has_function_privilege('anon','public.place_order(jsonb,text,text,text,text,text,timestamptz,public.payment_method,text,text,text,text,uuid,numeric)','EXECUTE') then raise exception 'Anonymous checkout access'; end if;
  if (select count(*) from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname='place_order')<>1 then raise exception 'Old bypass overload remains'; end if;
end $$;
create function pg_temp.checkout(area uuid,quote numeric,method public.payment_method default 'cod',kind text default 'delivery') returns uuid language sql as $$
 select public.place_order(jsonb_build_array(jsonb_build_object('variant_id',(select variant_id from fee_fixture),'quantity',2)),
   'ROLLBACK DELIVERY FEE CHECK','09000000000','Saved detailed address',null,null,null,method,
   case when method='gcash' then 'Fixture sender' end,case when method='gcash' then '09123456789' end,case when method='gcash' then 'FEE-CHECK-REF' end,kind,area,quote);
$$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
set local role authenticated;
do $$ declare a record; o uuid; c integer; begin
  for a in select distinct on(fee) id,name,fee from public.delivery_areas where is_active order by fee,name loop
    o:=pg_temp.checkout(a.id,a.fee,case when a.fee=150 then 'gcash'::public.payment_method else 'cod'::public.payment_method end);
    if not exists(select 1 from public.orders where id=o and subtotal=200 and delivery_fee=a.fee and total=200+a.fee and delivery_area_id=a.id and delivery_area_name=a.name and delivery_address=a.name||' '||chr(8212)||' Saved detailed address') then raise exception 'Wrong fee/name/address snapshot at tier %',a.fee; end if;
    if not exists(select 1 from public.payments where order_id=o and amount=200+a.fee) then raise exception 'Payment differs from order'; end if;
    perform public.cancel_own_order(o);
  end loop;
  o:=pg_temp.checkout((select id from public.delivery_areas where name='Camella Solomiente'),150);
  perform public.cancel_own_order(o);
  o:=pg_temp.checkout(null,null,'cod','pickup');
  if not exists(select 1 from public.orders where id=o and delivery_fee=0 and total=200 and delivery_area_id is null and delivery_area_name is null and delivery_address is null) then raise exception 'Pickup changed'; end if;
  perform public.cancel_own_order(o);
  select count(*) into c from public.orders;
  begin perform pg_temp.checkout(null,0); raise exception 'Missing area accepted';
  exception when raise_exception then if sqlerrm not like 'Choose a supported%' then raise; end if; end;
  begin perform pg_temp.checkout(gen_random_uuid(),70); raise exception 'Forged area accepted';
  exception when raise_exception then if sqlerrm not like 'Choose a supported%' then raise; end if; end;
  begin perform pg_temp.checkout((select id from public.delivery_areas where name='Mahabang Dahilig'),1); raise exception 'Underquoted fee accepted';
  exception when raise_exception then if sqlerrm not like 'Delivery fee changed%' then raise; end if; end;
  begin perform pg_temp.checkout((select id from public.delivery_areas where name='Camella Solomiente'),null); raise exception 'Missing quote accepted';
  exception when raise_exception then if sqlerrm not like 'Delivery fee changed%' then raise; end if; end;
  if (select count(*) from public.orders)<>c then raise exception 'Rejected quote created an order'; end if;
end $$;
reset role;
-- Rate/name changes apply only to future orders; saved snapshots stay intact.
do $$ begin
  if not exists(select 1 from public.inventory where id=(select inventory_id from fee_fixture) and current_stock=100 and reserved_stock=0) then raise exception 'Reservation/release or rejected-quote inventory invariant changed'; end if;
end $$;
create temporary table saved_orders as select id,delivery_fee,delivery_area_name,total from public.orders;
update public.delivery_areas set fee=151,name='Changed Camella fixture' where name='Camella Solomiente';
do $$ begin
  if exists(select 1 from saved_orders s join public.orders o using(id) where (o.delivery_fee,o.delivery_area_name,o.total) is distinct from (s.delivery_fee,s.delivery_area_name,s.total)) then raise exception 'Rate edit rewrote historical order'; end if;
end $$;
set local role authenticated;
do $$ begin
  begin perform pg_temp.checkout((select id from public.delivery_areas where name='Changed Camella fixture'),150); raise exception 'Stale quote accepted';
  exception when raise_exception then if sqlerrm not like 'Delivery fee changed%' then raise; end if; end;
end $$;
reset role;
update public.delivery_areas set is_active=false where name='Changed Camella fixture';
set local role authenticated;
do $$ begin
  if exists(select 1 from public.delivery_areas where name='Changed Camella fixture') then raise exception 'Inactive area visible'; end if;
  begin perform pg_temp.checkout((select delivery_area_id from public.orders where delivery_area_name='Camella Solomiente' limit 1),151); raise exception 'Inactive area accepted';
  exception when raise_exception then if sqlerrm not like 'Choose a supported%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform pg_temp.checkout(null,null,'cod','pickup'); raise exception 'Staff checkout accepted';
  exception when raise_exception then if sqlerrm not like 'Only active customers%' then raise; end if; end;
end $$;
reset role;
do $$ begin raise notice 'PASS all seven fee tiers, confirmed corrections, saved snapshots, COD/GCash totals, pickup, reservation/release and missing/forged/inactive/stale/underquoted area rejection'; end $$;
rollback;
