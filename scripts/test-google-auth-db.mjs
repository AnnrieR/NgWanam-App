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
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}');
    create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,provider text,provider_id text,identity_data jsonb);
    create table public.profiles(id uuid primary key references auth.users,is_active boolean default true);
    create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql as $$ select (auth.jwt()->>'sub')::uuid $$;
  `);
  sql(database, fs.readFileSync("supabase/migrations/20261105010000_google_identity_guards.sql", "utf8"));
  const output = sql(database, fs.readFileSync("scripts/test-google-auth-db.sql", "utf8"));
  assert(output.includes("GOOGLE_DB_GUARDS_PASS"));
  console.log("PASS PostgreSQL guards: case-normalized email uniqueness, automatic-link rejection, verified-only Google registration/login, fresh-password consent, expiry/single-use, same-email enforcement, privilege restrictions. Scratch schema only; not a live Google OAuth test.");
} finally {
  if (created) sql("postgres", `drop database ${database};`);
}
