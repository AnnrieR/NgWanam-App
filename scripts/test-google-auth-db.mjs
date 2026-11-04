// Explicit opt-in: creates and drops ONLY an owned, random scratch database.
// Never applies migrations to the application's postgres database.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";

const container = process.env.GOOGLE_TEST_DB_CONTAINER;
assert(container, "Set GOOGLE_TEST_DB_CONTAINER to an approved LOCAL Supabase postgres container.");
const database = `google_guard_test_${randomBytes(8).toString("hex")}`;
const sql = (db, input) => execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1"], { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
let created = false;
try {
  sql("postgres", `create database ${database};`); created = true;
  sql(database, `
    create schema auth; create schema private;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,raw_app_meta_data jsonb default '{}');
    create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,provider text,provider_id text,identity_data jsonb);
    create table public.profiles(id uuid primary key references auth.users,is_active boolean default true);
    create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql as $$ select (auth.jwt()->>'sub')::uuid $$;
  `);
  sql(database, fs.readFileSync("supabase/migrations/20261105010000_google_identity_guards.sql", "utf8"));
  const output = sql(database, `BEGIN;\n${fs.readFileSync("scripts/test-google-auth-db.sql", "utf8")}\nROLLBACK;`);
  assert(output.includes("GOOGLE_DB_GUARDS_PASS"));
  const softDeleteFixture = `
    insert into auth.users(id,email,raw_app_meta_data) values('20000000-0000-0000-0000-000000000001','soft-delete@gmail.com','{"provider":"google"}');
    insert into auth.identities(user_id,provider,provider_id,identity_data) values('20000000-0000-0000-0000-000000000001','google','soft-delete-sub','{"email":"soft-delete@gmail.com","email_verified":true}');
  `;
  sql(database, softDeleteFixture);
  // Reproduce GoTrue's order: user tombstone first, then identity clearing.
  sql(database, `do $$ begin
    begin
      update auth.users set email='obfuscated-owner',deleted_at=now() where id='20000000-0000-0000-0000-000000000001';
      update auth.identities set identity_data='{}' where user_id='20000000-0000-0000-0000-000000000001';
      raise exception 'FAIL old trigger unexpectedly allowed soft deletion';
    exception when raise_exception then
      if sqlerrm not like 'Google must verify%' then raise; end if;
    end;
  end $$;`);
  sql(database, fs.readFileSync("supabase/migrations/20261105030000_allow_google_identity_soft_deletion.sql", "utf8"));
  sql(database, `do $$ begin
    begin
      update auth.identities set identity_data='{}' where user_id='20000000-0000-0000-0000-000000000001';
      raise exception 'FAIL clearing live Google identity allowed';
    exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
    update auth.users set email='obfuscated-owner',deleted_at=now() where id='20000000-0000-0000-0000-000000000001';
    update auth.identities set identity_data='{}' where user_id='20000000-0000-0000-0000-000000000001';
    update auth.identities set provider_id='obfuscated-provider-id' where user_id='20000000-0000-0000-0000-000000000001';
    if not exists(select 1 from auth.identities where user_id='20000000-0000-0000-0000-000000000001' and identity_data='{}' and provider_id='obfuscated-provider-id') then raise exception 'FAIL Auth soft-delete sequence'; end if;
    begin
      update auth.identities set identity_data='{"email":"soft-delete@gmail.com","email_verified":true}' where user_id='20000000-0000-0000-0000-000000000001';
      raise exception 'FAIL deleted identity authenticated';
    exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
    begin
      insert into auth.identities(user_id,provider,provider_id,identity_data) values('20000000-0000-0000-0000-000000000001','google','new-deleted-sub','{}');
      raise exception 'FAIL deleted identity inserted';
    exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  end $$;`);
  // Re-run the original registration/linking tests against the fixed trigger too.
  assert(sql(database, `BEGIN;\n${fs.readFileSync("scripts/test-google-auth-db.sql", "utf8")}\nROLLBACK;`).includes("GOOGLE_DB_GUARDS_PASS"));
  console.log("PASS PostgreSQL guards: case-normalized email uniqueness, automatic-link rejection, verified-only Google registration/login, fresh-password consent, expiry/single-use, same-email enforcement, privilege restrictions. Scratch schema only; not a live Google OAuth test.");
  console.log("PASS reproduced original Google soft-delete rejection; patched trigger allows only tombstoned-user identity cleanup/provider obfuscation, rejects live-user clearing and deleted-account authentication/linking. Original Google security suite passes after the patch too.");
} finally {
  if (created) sql("postgres", `drop database ${database};`);
}
