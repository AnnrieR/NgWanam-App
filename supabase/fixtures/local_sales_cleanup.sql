do $$
declare f record; removed integer;
begin
  -- Only manifest-listed, unchanged fixtures qualify. Never match by customer,
  -- name, date, order-number range or phone; those may belong to manual tests.
  for f in select * from private.local_sales_fixture_orders where batch_key='local-sales-history-v1' loop
    if pg_temp.sales_fixture_snapshot(f.order_id) is distinct from f.snapshot
      or exists(select 1 from public.inventory_movements where order_id=f.order_id)
      or exists(select 1 from public.deliveries where order_id=f.order_id)
      or exists(select 1 from public.notifications where order_id=f.order_id)
      or exists(select 1 from public.activity_logs a where
        (a.record_type='orders' and a.record_id=f.order_id)
        or (a.record_type='payments' and a.record_id in(select id from public.payments where order_id=f.order_id))) then
      raise exception 'Fixture % changed or has operational activity; cleanup refused for manual review.',f.order_id;
    end if;
  end loop;
  delete from public.orders where id in(select order_id from private.local_sales_fixture_orders where batch_key='local-sales-history-v1');
  get diagnostics removed=row_count;
  delete from private.local_sales_fixture_orders where batch_key='local-sales-history-v1';
  perform pg_temp.assert_sales_fixture_preservation();
  raise notice 'Removed % exact, unchanged local history fixtures. Stock and pre-existing records preserved.',removed;
end $$;
