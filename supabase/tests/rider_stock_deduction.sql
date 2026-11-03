-- Rollback-only workflow: real RPC reservations, delivery, completion/cancellation.
begin;
do $$
declare item uuid; variant uuid; stock uuid; cart jsonb; o uuid; d uuid; p text; baseline integer; legacy uuid;
begin
  insert into public.menu_items(category_id,name) values((select id from public.categories limit 1),'ROLLBACK RIDER STOCK CHECK') returning id into item;
  insert into public.menu_variants(menu_item_id,name,serving_label,price) values(item,'Regular','Test',10) returning id into variant;
  insert into public.inventory(menu_variant_id,current_stock) values(variant,20) returning id into stock;
  cart:=jsonb_build_array(jsonb_build_object('variant_id',variant,'quantity',2));
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
  o:=public.place_order(cart,'Stock fixture','09000000000','Test',null,null,null,'cod',null,null,null,'delivery',(select id from public.delivery_areas where fee=70 limit 1),70);
  if not exists(select 1 from public.inventory where id=stock and current_stock=20 and reserved_stock=2) then raise exception 'Place order did not reserve only'; end if;
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
  perform public.update_order_status(o,'confirmed'); perform public.update_order_status(o,'preparing'); perform public.update_order_status(o,'ready');
  perform public.assign_delivery(o,'10000000-0000-0000-0000-000000000004');
  select id into d from public.deliveries where order_id=o;
  begin perform public.update_delivery_status(d,'out_for_delivery'); raise exception 'Staff acted as rider';
  exception when raise_exception then if sqlerrm not like 'Only active delivery%' then raise; end if; end;
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
  perform public.update_delivery_status(d,'out_for_delivery');
  begin perform public.update_delivery_status(d,'delivered'); raise exception 'Proofless delivered accepted';
  exception when raise_exception then if sqlerrm not like 'Upload a proof%' then raise; end if; end;
  if not exists(select 1 from public.inventory where id=stock and current_stock=20 and reserved_stock=2) then raise exception 'Start/missing proof changed stock'; end if;
  p:='10000000-0000-0000-0000-000000000004/'||d||'/'||gen_random_uuid()||'.png';
  insert into storage.objects(bucket_id,name) values('delivery-proofs',p);
  -- An inconsistent reservation must abort the entire delivery, not half-save.
  update public.inventory set reserved_stock=0 where id=stock;
  begin perform public.update_delivery_status(d,'delivered',p); raise exception 'Insufficient reserved stock accepted';
  exception when raise_exception then if sqlerrm not like 'Reserved stock could not%' then raise; end if; end;
  if not exists(select 1 from public.deliveries where id=d and status='out_for_delivery' and proof_photo_path is null) or not exists(select 1 from public.orders where id=o and stock_deducted_at is null) then raise exception 'Failed stock deduction partially marked delivered'; end if;
  update public.inventory set reserved_stock=2 where id=stock;
  perform public.update_delivery_status(d,'delivered',p);
  if not exists(select 1 from public.inventory where id=stock and current_stock=18 and reserved_stock=0) then raise exception 'Rider Delivered did not deduct once'; end if;
  if not exists(select 1 from public.orders where id=o and status='ready' and stock_deducted_at is not null) then raise exception 'Delivered auto-completed order or omitted stock marker'; end if;
  if (select count(*) from public.inventory_movements where order_id=o and movement_type='completion' and performed_by='10000000-0000-0000-0000-000000000004')<>1 then raise exception 'Missing rider stock audit'; end if;
  begin perform public.update_delivery_status(d,'delivered',p); raise exception 'Repeated delivery accepted';
  exception when raise_exception then if sqlerrm not like 'This delivery status%' then raise; end if; end;
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
  begin perform public.update_order_status(o,'cancelled'); raise exception 'Post-delivery cancellation accepted';
  exception when raise_exception then if sqlerrm not like 'Delivered orders cannot%' then raise; end if; end;
  perform public.update_order_status(o,'completed');
  if not exists(select 1 from public.inventory where id=stock and current_stock=18 and reserved_stock=0) or (select count(*) from public.inventory_movements where order_id=o and movement_type='completion')<>1 then raise exception 'Staff completion deducted again'; end if;
  begin perform public.update_order_status(o,'completed'); raise exception 'Repeated completion accepted';
  exception when raise_exception then if sqlerrm not like 'This order status%' then raise; end if; end;
  -- Pick-up: still deduct at Staff Completed, with no rider or proof required.
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
  o:=public.place_order(cart,'Pickup fixture','09000000000',null,null,null,null,'cod',null,null,null,'pickup');
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
  perform public.update_order_status(o,'confirmed'); perform public.update_order_status(o,'preparing'); perform public.update_order_status(o,'ready'); perform public.update_order_status(o,'completed');
  if not exists(select 1 from public.inventory where id=stock and current_stock=16 and reserved_stock=0) then raise exception 'Pickup stock changed incorrectly'; end if;
  -- Existing delivered-but-not-completed rows retain their reservation until
  -- staff finalizes them; the migration never silently reprices/deducts history.
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
  legacy:=public.place_order(cart,'Legacy fixture','09000000000','Test',null,null,null,'cod',null,null,null,'delivery',(select id from public.delivery_areas where fee=70 limit 1),70);
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
  perform public.update_order_status(legacy,'confirmed'); perform public.update_order_status(legacy,'preparing'); perform public.update_order_status(legacy,'ready');
  insert into public.deliveries(order_id,assigned_to,status,delivered_at) values(legacy,'10000000-0000-0000-0000-000000000004','delivered',now());
  perform public.update_order_status(legacy,'completed');
  if not exists(select 1 from public.inventory where id=stock and current_stock=14 and reserved_stock=0) then raise exception 'Legacy outstanding delivery not handled safely'; end if;
  -- Before delivery, cancellation releases reservations without restoring on-hand.
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
  o:=public.place_order(cart,'Cancel fixture','09000000000','Test',null,null,null,'cod',null,null,null,'delivery',(select id from public.delivery_areas where fee=70 limit 1),70);
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
  perform public.update_order_status(o,'confirmed'); perform public.update_order_status(o,'preparing'); perform public.update_order_status(o,'ready');
  perform public.assign_delivery(o,'10000000-0000-0000-0000-000000000004'); select id into d from public.deliveries where order_id=o;
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
  perform public.update_delivery_status(d,'out_for_delivery');
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true); perform public.update_order_status(o,'cancelled');
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
  begin perform public.update_delivery_status(d,'delivered',p); raise exception 'Cancelled order delivered';
  exception when raise_exception then if sqlerrm not like 'This order is no longer%' then raise; end if; end;
  if not exists(select 1 from public.inventory where id=stock and current_stock=14 and reserved_stock=0) then raise exception 'Cancellation lifecycle wrong'; end if;
  if has_function_privilege('authenticated','private.deduct_order_stock_once(uuid)','EXECUTE') or has_function_privilege('anon','public.update_delivery_status(uuid,public.delivery_status,text)','EXECUTE') then raise exception 'Unauthorized direct stock/RPC access'; end if;
  raise notice 'PASS rider-proof atomic deduction, replay/cancellation protection, staff no-double-deduct, pickup, legacy outstanding delivery, reservation failure rollback and private helper restrictions';
end $$;
rollback;
