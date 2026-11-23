// Explicitly selected LOCAL container only. Creates/drops its own scratch database.
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const container = process.env.FEEDBACK_TEST_DB_CONTAINER;
assert(container, "Set FEEDBACK_TEST_DB_CONTAINER to an approved LOCAL Supabase Postgres container.");
const database = `feedback_review_test_${randomBytes(8).toString("hex")}`;
const sql = (db, input) => execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1"], { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
let created = false;
try {
  sql("postgres", `create database ${database};`); created = true;
  sql(database, `
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.actor',true),'')::uuid $$;
    create table public.profiles(id uuid primary key,full_name text,role text,is_active boolean,deleted_at timestamptz);
    create function private.is_staff_or_admin() returns boolean language sql as $$ select exists(select 1 from public.profiles where id=auth.uid() and is_active and role in ('staff','admin')) $$;
    create table public.orders(id uuid primary key default gen_random_uuid(),order_number bigint generated always as identity,customer_id uuid,status text,order_type text);
    create table public.deliveries(id uuid primary key default gen_random_uuid(),order_id uuid references public.orders,assigned_to uuid,status text);
    grant usage on schema auth,private,public to authenticated,anon;
    grant select on public.profiles to authenticated;
    insert into public.profiles values
      ('10000000-0000-0000-0000-000000000001','Admin','admin',true,null),
      ('10000000-0000-0000-0000-000000000002','Staff','staff',true,null),
      ('10000000-0000-0000-0000-000000000003','Jane Doe','customer',true,null),
      ('10000000-0000-0000-0000-000000000004','Rider','delivery',true,null);
  `);
  sql(database, fs.readFileSync("supabase/migrations/20261019020000_delivery_rider_ratings.sql", "utf8"));
  // Seed one legacy rating BEFORE migration to verify safe defaults/backward compatibility.
  sql(database, `
    create function private.fixture() returns uuid language plpgsql as $$ declare o uuid:=gen_random_uuid(); begin
      insert into public.orders(id,customer_id,status,order_type) values(o,'10000000-0000-0000-0000-000000000003','completed','delivery');
      insert into public.deliveries(order_id,assigned_to,status) values(o,'10000000-0000-0000-0000-000000000004','delivered'); return o;
    end $$;
    select set_config('test.actor','10000000-0000-0000-0000-000000000003',false);
    select public.submit_delivery_rating(private.fixture(),4,'Legacy comment');
  `);
  sql(database, fs.readFileSync("supabase/migrations/20261124010000_moderate_rider_feedback.sql", "utf8"));
  sql(database, `
    do $$ declare o uuid; positive uuid; negative uuid; legacy uuid; begin
      if exists(select 1 from public.delivery_ratings where allow_public or review_status<>'pending') then raise exception 'FAIL unsafe legacy default'; end if;
      perform set_config('test.actor','10000000-0000-0000-0000-000000000003',true);
      o:=private.fixture(); perform public.submit_delivery_rating_with_consent(o,5,'Great rider',true);
      select r.id into positive from public.delivery_ratings r join public.deliveries d on d.id=r.delivery_id where d.order_id=o;
      begin perform public.submit_delivery_rating_with_consent(o,5,'Duplicate',true); raise exception 'FAIL duplicate allowed'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      perform public.submit_delivery_rating_with_consent(private.fixture(),1,'Bad experience retained privately',true);
      select id into negative from public.delivery_ratings where rating=1;
      select id into legacy from public.delivery_ratings where rating=4;
      if exists(select 1 from public.get_public_rider_testimonials()) then raise exception 'FAIL pending public'; end if;
      begin perform public.moderate_rider_feedback(positive,'approved','Great rider'); raise exception 'FAIL customer approved'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      perform set_config('test.actor','10000000-0000-0000-0000-000000000002',true);
      begin perform public.get_admin_rider_feedback(); raise exception 'FAIL staff read queue'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      perform set_config('test.actor','10000000-0000-0000-0000-000000000001',true);
      if (select count(*) from public.get_admin_rider_feedback())<>3 then raise exception 'FAIL admin queue'; end if;
      begin perform public.moderate_rider_feedback(negative,'approved','Bad experience'); raise exception 'FAIL negative approved'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      begin perform public.moderate_rider_feedback(legacy,'approved','Legacy comment'); raise exception 'FAIL consent bypass'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
      perform public.moderate_rider_feedback(positive,'approved','Great rider');
      if not exists(select 1 from public.get_public_rider_testimonials() where customer_initials='J.D.' and rating=5 and quote='Great rider') then raise exception 'FAIL approved initials'; end if;
      perform public.moderate_rider_feedback(positive,'private',null);
      if exists(select 1 from public.get_public_rider_testimonials()) then raise exception 'FAIL unpublish'; end if;
      if not exists(select 1 from public.get_rider_rating_summaries() where rating_count=3 and average_rating=3.3) then raise exception 'FAIL biased internal average'; end if;
      if (select comment from public.delivery_ratings where id=negative)<>'Bad experience retained privately' then raise exception 'FAIL lost negative'; end if;
      if has_function_privilege('anon','public.get_admin_rider_feedback()','EXECUTE') then raise exception 'FAIL anon admin grant'; end if;
      if has_table_privilege('authenticated','public.delivery_ratings','UPDATE') then raise exception 'FAIL direct update'; end if;
    end $$;
    set role anon; select * from public.get_public_rider_testimonials(); reset role;
    select set_config('test.actor','10000000-0000-0000-0000-000000000004',false);
    set role authenticated;
    do $$ begin if exists(select 1 from public.delivery_ratings) then raise exception 'FAIL rider raw feedback access'; end if; end $$;
    reset role;
    select set_config('test.actor','10000000-0000-0000-0000-000000000003',false);
    set role authenticated;
    do $$ begin if (select count(*) from public.delivery_ratings)<>3 then raise exception 'FAIL author own feedback'; end if; end $$;
    reset role;
  `);
  console.log("PASS isolated real SQL: legacy privacy, consent/eligibility/once-only, admin-only queue/moderation, pending/private not public, initials, unpublish, preserved negative comments/unbiased internal average, anonymous function access and raw-feedback RLS. Scratch DB only.");
} finally { if (created) sql("postgres", `drop database ${database};`); }
