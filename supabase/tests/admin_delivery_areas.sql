-- Rollback-only. No permanent location, order, payment or stock changes.
begin;
create temporary table area_test_snapshot as
select 'orders' name, md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) hash from public.orders t
union all select 'delivery_areas', md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.delivery_areas t;
savepoint before_fixtures;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into public.delivery_areas(id,name,fee,is_active) values('abababab-0000-4000-8000-000000000001','  Local   test location  ',123.45,false);
do $$ begin
  if not exists(select 1 from public.delivery_areas where id='abababab-0000-4000-8000-000000000001' and name='Local test location' and not is_active) then raise exception 'Admin inactive read/normalization failed'; end if;
  begin
    insert into public.delivery_areas(name,fee) values('LOCAL TEST LOCATION',1);
    raise exception 'Duplicate accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.delivery_areas(name,fee) values('Bad fee',-1);
    raise exception 'Negative accepted';
  exception when check_violation then null; end;
end $$;
update public.delivery_areas set name='Edited local test location',fee=150,is_active=true where id='abababab-0000-4000-8000-000000000001';
reset role;
do $$ begin
  if (select count(*) from public.activity_logs where record_id='abababab-0000-4000-8000-000000000001' and actor_id='10000000-0000-0000-0000-000000000001') <> 2 then raise exception 'Audit failed'; end if;
end $$;
set local role authenticated;
-- Staff, rider and customer cannot insert/update; active customers can read.
do $$ declare account text; changed integer; begin
  foreach account in array array['10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000005'] loop
    perform set_config('request.jwt.claim.sub',account,true);
    begin
      insert into public.delivery_areas(name,fee) values('Unauthorized location',1);
      raise exception 'Non-admin insert accepted';
    exception when insufficient_privilege then null; end;
    update public.delivery_areas set fee=999 where id='abababab-0000-4000-8000-000000000001';
    get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'Non-admin update accepted'; end if;
  end loop;
  if not exists(select 1 from public.delivery_areas where id='abababab-0000-4000-8000-000000000001' and fee=150) then raise exception 'Active area unavailable'; end if;
end $$;
reset role;
update public.delivery_areas set is_active=false where id='abababab-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
  if exists(select 1 from public.delivery_areas where id='abababab-0000-4000-8000-000000000001') then raise exception 'Inactive area visible to customer'; end if;
end $$;
reset role;
-- Inactive administrators must not write.
update public.profiles set is_active=false where id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
  begin
    insert into public.delivery_areas(name,fee) values('Inactive admin location',1);
    raise exception 'Inactive admin insert accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback to before_fixtures;
do $$ begin
  if (select hash from area_test_snapshot where name='orders') is distinct from (select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.orders t) then raise exception 'Orders changed'; end if;
  if (select hash from area_test_snapshot where name='delivery_areas') is distinct from (select md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.delivery_areas t) then raise exception 'Area fixtures not rolled back'; end if;
end $$;
rollback;
