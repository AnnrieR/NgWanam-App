-- Rollback-only permission/history tests. Uses seeded local accounts.
begin;
create temporary table area_delete_snapshot as
select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) hash from public.orders t;
select set_config('test.used_area_id',coalesce((select delivery_area_id::text from public.orders where delivery_area_id is not null limit 1),''),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into public.delivery_areas(id,name,fee) values('abababab-0000-4000-8000-000000000002','Deletion regression fixture',123);
-- Non-administrators cannot delete even an active, readable location.
do $$ declare account text; changed integer; begin
  foreach account in array array['10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000005'] loop
    perform set_config('request.jwt.claim.sub',account,true);
    delete from public.delivery_areas where id='abababab-0000-4000-8000-000000000002';
    get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'Non-admin deleted location'; end if;
  end loop;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    delete from public.delivery_areas where id='abababab-0000-4000-8000-000000000002';
    raise exception 'Guest delete allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Inactive admins are also denied.
savepoint before_inactive_admin;
update public.profiles set is_active=false where id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare changed integer; begin
  delete from public.delivery_areas where id='abababab-0000-4000-8000-000000000002';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Inactive admin deleted location'; end if;
end $$;
reset role;
rollback to before_inactive_admin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
delete from public.delivery_areas where id='abababab-0000-4000-8000-000000000002';
do $$ begin
  if exists(select 1 from public.delivery_areas where id='abababab-0000-4000-8000-000000000002') then raise exception 'Admin deletion failed'; end if;
  if current_setting('test.used_area_id') <> '' then
    begin
      delete from public.delivery_areas where id=current_setting('test.used_area_id')::uuid;
      raise exception 'Used location was deleted';
    exception when foreign_key_violation then null; end;
  else
    raise notice 'No linked order fixture: checking FK delete rule instead';
  end if;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.orders'::regclass and conname='orders_delivery_area_id_fkey' and confdeltype='r') then raise exception 'FK must restrict deletion'; end if;
  if not exists(select 1 from public.activity_logs where record_id='abababab-0000-4000-8000-000000000002' and action='delivery_area_deleted' and actor_id='10000000-0000-0000-0000-000000000001') then raise exception 'Delete audit missing'; end if;
  if (select hash from area_delete_snapshot) is distinct from (select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.orders t) then raise exception 'Order history changed'; end if;
end $$;
rollback;
