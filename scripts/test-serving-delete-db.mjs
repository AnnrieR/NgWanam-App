import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";

const container = process.env.MENU_TEST_DB_CONTAINER;
assert(container, "Set MENU_TEST_DB_CONTAINER to an approved LOCAL Postgres container.");
const database = `serving_delete_test_${randomBytes(8).toString("hex")}`;
const sql = (db, input) => execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1"], { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
let created = false;
try {
  sql("postgres", `create database ${database};`); created = true;
  sql(database, `
    create schema private;
    create function private.is_staff_or_admin() returns boolean language sql as $$ select coalesce(current_setting('test.staff',true),'false')='true' $$;
    create table public.menu_variants(id uuid primary key default gen_random_uuid(),menu_item_id uuid not null,name text not null,price numeric not null,is_active boolean not null default true,unique(menu_item_id,name));
    create table public.inventory(id uuid primary key default gen_random_uuid(),menu_variant_id uuid references public.menu_variants,current_stock integer,reserved_stock integer);
    create table public.order_items(id uuid primary key default gen_random_uuid(),menu_variant_id uuid references public.menu_variants,variant_name text,unit_price numeric);
  `);
  sql(database, fs.readFileSync("supabase/migrations/20261105020000_retire_menu_servings.sql", "utf8"));
  sql(database, `do $$
    declare v uuid:=gen_random_uuid(); other_v uuid:=gen_random_uuid(); item uuid:=gen_random_uuid(); before_orders text; before_stock text;
    begin
      insert into public.menu_variants(id,menu_item_id,name,price) values(v,item,'Regular',110),(other_v,item,'Large',250);
      insert into public.inventory(menu_variant_id,current_stock,reserved_stock) values(v,20,2);
      insert into public.order_items(menu_variant_id,variant_name,unit_price) values(v,'Regular',110);
      select md5(jsonb_agg(to_jsonb(t))::text) into before_orders from public.order_items t;
      select md5(jsonb_agg(to_jsonb(t))::text) into before_stock from public.inventory t;
      begin
        perform public.delete_menu_variant(v); raise exception 'FAIL unauthorized delete';
      exception when insufficient_privilege then null; end;
      perform set_config('test.staff','true',true);
      perform public.delete_menu_variant(v);
      if not exists(select 1 from public.menu_variants where id=v and retired_at is not null and not is_active) then raise exception 'FAIL not retired'; end if;
      if not exists(select 1 from public.menu_variants where id=other_v and retired_at is null and is_active and price=250) then raise exception 'FAIL sibling changed'; end if;
      if (select md5(jsonb_agg(to_jsonb(t))::text) from public.order_items t)<>before_orders or (select md5(jsonb_agg(to_jsonb(t))::text) from public.inventory t)<>before_stock then raise exception 'FAIL history/stock changed'; end if;
      begin
        update public.menu_variants set is_active=true where id=v; raise exception 'FAIL retired on sale';
      exception when check_violation then null; end;
      begin
        perform public.delete_menu_variant(v); raise exception 'FAIL repeated delete accepted';
      exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      begin
        perform public.delete_menu_variant(gen_random_uuid()); raise exception 'FAIL missing row accepted';
      exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      insert into public.menu_variants(menu_item_id,name,price) values(item,'Regular',120);
      begin
        insert into public.menu_variants(menu_item_id,name,price) values(item,'Regular',130); raise exception 'FAIL active duplicate allowed';
      exception when unique_violation then null; end;
      if has_function_privilege('anon','public.delete_menu_variant(uuid)','EXECUTE') then raise exception 'FAIL anonymous execute'; end if;
    end;
    $$;`);
  console.log("PASS serving-delete SQL: authorization, retirement, sibling/stock/order-reference preservation, cannot put retired serving on sale, missing/repeated-delete errors and safe name reuse. Scratch database only; no working app migrations.");
} finally {
  if (created) sql("postgres", `drop database ${database};`);
}
