do $$
declare
  batch constant text := 'local-sales-history-v1';
  anchor date := (now() at time zone 'Asia/Manila')::date;
  customer uuid := '10000000-0000-0000-0000-000000000005';
  names text[] := array['Bihon','Canton','Fried Chicken','Pork Sisig','Fried Rice','Lumpia Shanghai','Leche Flan','Hototay Soup'];
  counts integer[] := array[3,5,2,6,4,5,3];
  day_index integer; sale_index integer; line_index integer; item_index integer;
  quantity integer; v_subtotal numeric; o uuid; p uuid; placed timestamptz; finished timestamptz;
  method public.payment_method; serving record; fixture_row record;
begin
  if exists(select 1 from private.local_sales_fixture_orders where batch_key=batch) then
    if (select count(*) from private.local_sales_fixture_orders where batch_key=batch) <> 28 then
      raise exception 'Incomplete fixture manifest; manual review required.';
    end if;
    for fixture_row in select * from private.local_sales_fixture_orders where batch_key=batch loop
      if pg_temp.sales_fixture_snapshot(fixture_row.order_id) is distinct from fixture_row.snapshot then
        raise exception 'Existing fixture % was changed; refusing to overwrite.',fixture_row.order_id;
      end if;
    end loop;
    raise notice 'History batch already exists. No dates shifted and no duplicate orders added.';
    return;
  end if;
  if not exists(select 1 from public.profiles where id=customer and role='customer' and is_active) then
    raise exception 'Expected active local customer account is missing; no accounts will be created or modified.';
  end if;
  -- Deterministic serving selection: actual approved names/prices, no menu edits.
  create temporary table if not exists sales_fixture_menu on commit drop as
  select distinct on (mi.name) mi.name item_name,mv.id,mv.name variant_name,mv.price
  from public.menu_items mi join public.menu_variants mv on mv.menu_item_id=mi.id
  where mi.name=any(names) and mi.is_active and mi.approval_status='approved' and mv.is_active
  order by mi.name,mv.price,mv.id;
  if (select count(*) from sales_fixture_menu) <> 8 then
    raise exception 'Expected eight approved local menu items were not found; no partial history will be added.';
  end if;
  for day_index in 1..7 loop
    for sale_index in 1..counts[day_index] loop
      o:=gen_random_uuid(); p:=gen_random_uuid();
      placed:=(((anchor-8+day_index)+time '10:00') at time zone 'Asia/Manila')
        + make_interval(mins=>sale_index*53+day_index*7);
      finished:=placed+interval '40 minutes';
      method:=case when (day_index+sale_index)%2=0 then 'gcash'::public.payment_method else 'cod'::public.payment_method end;
      select sum(s.price*(1+(day_index+sale_index+line.n)%3)) into v_subtotal
      from generate_series(1,1+(day_index+sale_index)%3) line(n)
      join sales_fixture_menu s on s.item_name=names[1+(day_index*3+sale_index+line.n*2)%8];
      -- Imported completed pick-up history: no reservation, delivery/proof or
      -- deduction RPC. Null stock marker matches historical completed records.
      insert into public.orders(id,customer_id,status,contact_name,contact_phone,
        delivery_address,order_type,subtotal,delivery_fee,total,created_at,updated_at,completed_at)
      values(o,customer,'completed','Walk-in customer','Not recorded',null,'pickup',v_subtotal,0,v_subtotal,placed,finished,finished);
      for line_index in 1..(1+(day_index+sale_index)%3) loop
        item_index:=1+(day_index*3+sale_index+line_index*2)%8;
        select * into strict serving from sales_fixture_menu where item_name=names[item_index];
        quantity:=1+(day_index+sale_index+line_index)%3;
        insert into public.order_items(order_id,menu_variant_id,item_name,variant_name,quantity,unit_price,subtotal)
        values(o,serving.id,serving.item_name,serving.variant_name,quantity,serving.price,quantity*serving.price);
      end loop;
      insert into public.payments(id,order_id,method,status,amount,gcash_sender_name,gcash_number,
        gcash_reference_number,created_at,updated_at)
      values(p,o,method,'paid',v_subtotal,
        case when method='gcash' then 'Walk-in customer' end,
        case when method='gcash' then 'Not recorded' end,
        case when method='gcash' then 'LOCAL-HISTORY-'||o::text end,placed,finished);
      -- Do not send old-order alerts or fabricate staff actions. Only trigger
      -- output for this brand-new UUID is removed inside the same transaction.
      delete from public.notifications where order_id=o;
      delete from public.activity_logs where record_type='orders' and record_id=o;
      insert into private.local_sales_fixture_orders(order_id,batch_key,anchor_date,snapshot)
      values(o,batch,anchor,pg_temp.sales_fixture_snapshot(o));
    end loop;
  end loop;
  perform pg_temp.assert_sales_fixture_preservation();
  if (select count(*) from private.local_sales_fixture_orders where batch_key=batch) <> 28
    or exists(select 1 from public.orders o join private.local_sales_fixture_orders f on f.order_id=o.id
      where f.batch_key=batch and (o.subtotal<>(select sum(i.subtotal) from public.order_items i where i.order_id=o.id)
        or o.total<>(select p.amount from public.payments p where p.order_id=o.id))) then
    raise exception 'Fixture count/amount integrity check failed.';
  end if;
  raise notice 'Added 28 synthetic local past sales, % through %. Existing transactions and stock preserved.',anchor-7,anchor-1;
end $$;
