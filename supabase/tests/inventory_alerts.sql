-- Transaction-only fixtures: no orders or persistent stock changes.
begin;
do $$
declare v_item uuid; v_variant uuid; v_stock uuid; v_version timestamptz;
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='inventory') then
    raise exception 'Inventory Realtime publication missing';
  end if;
  insert into public.menu_items(category_id,name) values((select id from public.categories limit 1),'Rollback inventory alert fixture') returning id into v_item;
  insert into public.menu_variants(menu_item_id,name,serving_label,price) values(v_item,'Regular','Test serving',10) returning id into v_variant;
  insert into public.inventory(menu_variant_id,current_stock,reserved_stock,minimum_stock) values(v_variant,25,15,10) returning id,updated_at into v_stock,v_version;
  if not exists(select 1 from public.inventory where id=v_stock and current_stock-reserved_stock=minimum_stock) then raise exception 'Boundary formula failed'; end if;
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
  perform public.update_inventory_stock_checked(v_stock,25,11,v_version);
  if not exists(select 1 from public.inventory where id=v_stock and current_stock=25 and reserved_stock=15 and minimum_stock=11) then raise exception 'Threshold update changed other quantities'; end if;
  begin
    perform public.update_inventory_stock_checked(v_stock,25,12,v_version-interval '1 second');
    raise exception 'Stale edit unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm not like 'Stock changed%' then raise; end if;
  end;
  begin
    perform public.update_inventory_stock_checked(v_stock,14,11,v_version);
    raise exception 'Stock below reservations unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm not like 'Current stock cannot%' then raise; end if;
  end;
  begin
    perform public.update_inventory_stock_checked(v_stock,25,-1,v_version);
    raise exception 'Negative threshold unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm not like 'Stock and threshold%' then raise; end if;
  end;
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
  perform public.update_inventory_stock_checked(v_stock,25,10,v_version);
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
  begin
    perform public.update_inventory_stock_checked(v_stock,25,10,v_version);
    raise exception 'Customer inventory update unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm not like 'Only staff or admin%' then raise; end if;
  end;
  if has_function_privilege('anon','public.update_inventory_stock_checked(uuid,integer,integer,timestamptz)','EXECUTE') then raise exception 'Anon RPC access'; end if;
  raise notice 'PASS threshold-only save preserves on-hand/reservations; staff/admin allowed; stale/negative/below-reserved/customer/anon changes denied';
end $$;
rollback;
