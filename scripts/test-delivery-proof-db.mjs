import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const container = process.env.DELIVERY_TEST_DB_CONTAINER;
assert(container, "Set DELIVERY_TEST_DB_CONTAINER to an approved LOCAL Supabase Postgres container.");
const database = `optional_proof_test_${randomBytes(8).toString("hex")}`;
const sql = (db, input) => execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1"], { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
let created = false;
try {
  sql("postgres", `create database ${database};`); created = true;
  sql(database, `
    create schema private; create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.actor',true),'')::uuid $$;
  `);
  sql(database, `
    create type public.delivery_status as enum('assigned','out_for_delivery','delivered');
    create type public.order_status as enum('pending','confirmed','preparing','ready','completed','cancelled');
    create table public.profiles(id uuid primary key,role text,is_active boolean);
    create function private.is_staff_or_admin() returns boolean language sql as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','staff') and is_active) $$;
    create table public.orders(id uuid primary key,status public.order_status,order_type text);
    create table public.deliveries(id uuid primary key,order_id uuid references public.orders,assigned_to uuid,status public.delivery_status,proof_photo_path text,out_for_delivery_at timestamptz,delivered_at timestamptz);
    create table public.inventory(id uuid primary key,menu_variant_id uuid,current_stock integer,reserved_stock integer);
    create table public.order_items(order_id uuid references public.orders,menu_variant_id uuid,quantity integer);
    create table public.inventory_movements(inventory_id uuid,order_id uuid,quantity integer,movement_type text,performed_by uuid);
    create table storage.objects(bucket_id text,name text);
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
  `);
  // Install the real existing one-time deduction and staff-completion functions.
  sql(database, fs.readFileSync("supabase/migrations/20261020030000_deduct_stock_at_rider_delivered.sql", "utf8"));
  sql(database, `revoke all on function public.update_delivery_status(uuid,public.delivery_status,text) from public,anon; grant execute on function public.update_delivery_status(uuid,public.delivery_status,text) to authenticated;`);
  const aclBefore = sql(database, "select proacl::text from pg_proc where oid='public.update_delivery_status(uuid,public.delivery_status,text)'::regprocedure;");
  sql(database, fs.readFileSync("supabase/migrations/20261106020000_optional_delivery_proof.sql", "utf8"));
  assert.equal(sql(database, "select proacl::text from pg_proc where oid='public.update_delivery_status(uuid,public.delivery_status,text)'::regprocedure;"), aclBefore);
  sql(database, `
    insert into public.profiles values ('10000000-0000-0000-0000-000000000001','delivery',true),('10000000-0000-0000-0000-000000000002','delivery',true),('10000000-0000-0000-0000-000000000003','admin',true);
    create function private.fixture(p_status public.delivery_status default 'out_for_delivery') returns uuid language plpgsql as $$
      declare o uuid:=gen_random_uuid(); d uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); begin
        insert into public.orders values(o,'ready','delivery',null);
        insert into public.deliveries(id,order_id,assigned_to,status) values(d,o,auth.uid(),p_status);
        insert into public.inventory values(gen_random_uuid(),v,15,2);
        insert into public.order_items values(o,v,2);
        return d;
      end $$;
    do $$
    declare d uuid; o uuid; p text; bad text; before_proofs text;
    begin
      perform set_config('test.actor','10000000-0000-0000-0000-000000000001',true);
      d:=private.fixture(); select order_id into o from public.deliveries where id=d;
      perform public.update_delivery_status(d,'delivered',null);
      if not exists(select 1 from public.deliveries where id=d and status='delivered' and delivered_at is not null and proof_photo_path is null) then raise exception 'FAIL no-photo delivery'; end if;
      if not exists(select 1 from public.inventory i join public.order_items oi on oi.menu_variant_id=i.menu_variant_id where oi.order_id=o and i.current_stock=13 and i.reserved_stock=0) then raise exception 'FAIL no-photo stock'; end if;
      if (select count(*) from public.inventory_movements where order_id=o)<>1 then raise exception 'FAIL movement count'; end if;
      begin perform public.update_delivery_status(d,'delivered',null); raise exception 'FAIL repeated delivery'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      perform set_config('test.actor','10000000-0000-0000-0000-000000000003',true);
      perform public.update_order_status(o,'completed');
      if (select count(*) from public.inventory_movements where order_id=o)<>1 then raise exception 'FAIL staff deducted twice'; end if;
      if not exists(select 1 from public.inventory i join public.order_items oi on oi.menu_variant_id=i.menu_variant_id where oi.order_id=o and i.current_stock=13) then raise exception 'FAIL staff stock'; end if;

      perform set_config('test.actor','10000000-0000-0000-0000-000000000001',true);
      d:=private.fixture(); select order_id into o from public.deliveries where id=d;
      p:=auth.uid()::text||'/'||d::text||'/proof.webp';
      insert into storage.objects values('delivery-proofs',p);
      perform public.update_delivery_status(d,'delivered',p);
      if (select proof_photo_path from public.deliveries where id=d)<>p then raise exception 'FAIL photo not saved'; end if;
      if (select count(*) from public.inventory_movements where order_id=o)<>1 then raise exception 'FAIL photo stock'; end if;

      d:=private.fixture(); select order_id into o from public.deliveries where id=d;
      foreach bad in array array['missing', '10000000-0000-0000-0000-000000000002/'||d::text||'/proof.webp',auth.uid()::text||'/'||gen_random_uuid()::text||'/proof.webp'] loop
        insert into storage.objects values('delivery-proofs',bad);
        begin perform public.update_delivery_status(d,'delivered',bad); raise exception 'FAIL invalid proof accepted'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      end loop;
      if exists(select 1 from public.inventory_movements where order_id=o) then raise exception 'FAIL invalid proof consumed stock'; end if;
      perform set_config('test.actor','10000000-0000-0000-0000-000000000002',true);
      begin perform public.update_delivery_status(d,'delivered',null); raise exception 'FAIL wrong rider'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      perform set_config('test.actor','10000000-0000-0000-0000-000000000003',true);
      begin perform public.update_delivery_status(d,'delivered',null); raise exception 'FAIL non rider'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      perform set_config('test.actor','10000000-0000-0000-0000-000000000001',true);
      update public.profiles set is_active=false where id=auth.uid();
      begin perform public.update_delivery_status(d,'delivered',null); raise exception 'FAIL inactive rider'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      update public.profiles set is_active=true where id=auth.uid();

      update public.inventory i set reserved_stock=0 from public.order_items oi where oi.order_id=o and oi.menu_variant_id=i.menu_variant_id;
      begin perform public.update_delivery_status(d,'delivered',null); raise exception 'FAIL missing reservation'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      if (select status from public.deliveries where id=d)<>'out_for_delivery' or exists(select 1 from public.inventory_movements where order_id=o) then raise exception 'FAIL failed deduction not rolled back'; end if;
      update public.orders set status='cancelled' where id=o;
      begin perform public.update_delivery_status(d,'delivered',null); raise exception 'FAIL cancelled order'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;

      d:=private.fixture('assigned');
      begin perform public.update_delivery_status(d,'delivered',null); raise exception 'FAIL skipped transition'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      perform public.update_delivery_status(d,'out_for_delivery',null);
      perform public.update_delivery_status(d,'delivered',null);
      if has_function_privilege('anon','public.update_delivery_status(uuid,public.delivery_status,text)','EXECUTE') then raise exception 'FAIL public permission'; end if;
    end $$;
  `);
  console.log("PASS real SQL in isolated scratch database: optional/valid proof, invalid/wrong-rider/wrong-delivery proof rejected, active assigned rider and ready-order gates, transition guards, reservation failure rollback, one-time stock deduction and no second deduction on staff completion, function ACL preserved. No working/live data touched.");
} finally {
  if (created) sql("postgres", `drop database ${database};`);
}
