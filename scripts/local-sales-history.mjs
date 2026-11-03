// Explicit, local Docker-only fixtures. Never called by seed, migrations or dev.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const mode = process.argv[2];
if (!["add", "cleanup", "check"].includes(mode)) {
  console.error("Usage: node scripts/local-sales-history.mjs add|cleanup|check");
  process.exit(1);
}
const read = name => readFileSync(new URL(`../supabase/fixtures/${name}.sql`, import.meta.url), "utf8");
const common = read("local_sales_common");
const add = read("local_sales_add");
const cleanup = read("local_sales_cleanup");
const body = mode === "check" ? `${add}\n${add}\n${cleanup}\n${cleanup}\n${add}` : mode === "add" ? add : cleanup;
const sql = `begin isolation level repeatable read;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
${common}
${body}
${mode === "check" ? "rollback" : "commit"};`;
execFileSync("docker", ["exec", "-i", "supabase_db_ng_wanam", "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
  input: sql, stdio: ["pipe", "inherit", "inherit"],
});
console.log(mode === "check" ? "Rollback-only add / cleanup / re-add check passed. Order-number sequence gaps are normal." : `Local sample sales: ${mode} finished.`);
