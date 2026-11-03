-- Rollback-only checks: run against a disposable seeded database or local DB.
begin;
do $$
begin
  if exists(select 1 from public.payments where method='card') then raise exception 'Card records remain'; end if;
  if exists(select 1 from public.inventory i where reserved_stock<>coalesce((
    select sum(oi.quantity) from public.order_items oi join public.orders o on o.id=oi.order_id
     where oi.menu_variant_id=i.menu_variant_id and o.status in ('pending','confirmed','preparing','ready') and o.stock_deducted_at is null
  ),0)) then raise exception 'Reservation mismatch'; end if;
  if (select count(*) from storage.buckets where id in ('avatars','menu-photos','delivery-proofs') and file_size_limit=1048575)<>3
    then raise exception 'Image limits missing'; end if;
end $$;

create temporary table review_fixture(item_id uuid,variant_id uuid,inventory_id uuid,order_id uuid);
grant select on review_fixture to authenticated;
do $$
declare item uuid; variant uuid; stock uuid; receipt uuid;
begin
  insert into public.menu_items(category_id,name) values((select id from public.categories limit 1),'Migration review fixture') returning id into item;
  insert into public.menu_variants(menu_item_id,name,serving_label,price) values(item,'Regular','Regular',10) returning id into variant;
  insert into public.inventory(menu_variant_id,current_stock) values(variant,10) returning id into stock;
  insert into public.orders(customer_id,status,contact_name,contact_phone,delivery_address,subtotal,delivery_fee,total)
  values('10000000-0000-0000-0000-000000000005','completed','Review fixture','09000000000','Test',10,0,10) returning id into receipt;
  insert into public.order_items(order_id,menu_variant_id,item_name,variant_name,quantity,unit_price,subtotal)
  values(receipt,variant,'Migration review fixture','Regular',1,10,10);
  insert into public.inventory_movements(inventory_id,order_id,quantity,movement_type) values(stock,receipt,-1,'completion');
  insert into review_fixture values(item,variant,stock,receipt);
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.delete_menu_item(item_id) from review_fixture;
reset role;
do $$
begin
  if exists(select 1 from public.menu_items where id=(select item_id from review_fixture)) then raise exception 'Menu not deleted'; end if;
  if not exists(select 1 from public.order_items where order_id=(select order_id from review_fixture)
    and menu_variant_id is null and item_name='Migration review fixture' and unit_price=10)
    then raise exception 'Historical order line lost'; end if;
  if not exists(select 1 from public.inventory_movements where order_id=(select order_id from review_fixture)
    and inventory_id is null and quantity=-1) then raise exception 'Movement history lost'; end if;
  raise notice 'PASS: COD/GCash, reservations, upload limits, authenticated menu delete preserves historical order lines and movements';
end $$;
rollback;
