-- Optional synthetic history, NOT genuine restaurant sales. Local-only runner.
-- The private manifest keeps provenance out of visible names while permitting
-- exact cleanup. No public-schema/API changes, stock movements or fake proofs.
select pg_advisory_xact_lock(hashtext('ngwanam-local-sales-history-v1'));
create table if not exists private.local_sales_fixture_orders (
  order_id uuid primary key,
  batch_key text not null,
  anchor_date date not null,
  snapshot jsonb not null
);
revoke all on private.local_sales_fixture_orders from public, anon, authenticated;

create or replace function pg_temp.sales_fixture_snapshot(p_order_id uuid)
returns jsonb language sql as $$
  select jsonb_build_object(
    'order', (select to_jsonb(o) from public.orders o where id=p_order_id),
    'items', (select coalesce(jsonb_agg(to_jsonb(i) order by id),'[]'::jsonb) from public.order_items i where order_id=p_order_id),
    'payments', (select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]'::jsonb) from public.payments p where order_id=p_order_id)
  );
$$;

-- Verify our statements preserve stock and all pre-existing transaction rows.
create temporary table sales_fixture_protected on commit drop as
select 'orders' as relation, id, to_jsonb(o) as row_data from public.orders o
where not exists(select 1 from private.local_sales_fixture_orders f where f.order_id=o.id)
union all select 'order_items', id, to_jsonb(i) from public.order_items i
where not exists(select 1 from private.local_sales_fixture_orders f where f.order_id=i.order_id)
union all select 'payments', id, to_jsonb(p) from public.payments p
where not exists(select 1 from private.local_sales_fixture_orders f where f.order_id=p.order_id)
union all select 'inventory', id, to_jsonb(i) from public.inventory i
union all select 'inventory_movements', id, to_jsonb(m) from public.inventory_movements m
union all select 'deliveries', id, to_jsonb(d) from public.deliveries d
union all select 'notifications', id, to_jsonb(n) from public.notifications n
union all select 'activity_logs', id, to_jsonb(a) from public.activity_logs a;

create or replace function pg_temp.assert_sales_fixture_preservation()
returns void language plpgsql as $$
declare r record; actual jsonb;
begin
  for r in select * from sales_fixture_protected loop
    execute format('select to_jsonb(t) from public.%I t where id=$1',r.relation) into actual using r.id;
    if actual is distinct from r.row_data then
      raise exception 'Pre-existing % row % changed; rolling back.',r.relation,r.id;
    end if;
  end loop;
end $$;
