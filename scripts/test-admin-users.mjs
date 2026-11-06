import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { cn } from "cn";

function load(file, mocks, react = React) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", output)(loaded, loaded.exports, name => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return jsx;
    assert(Object.hasOwn(mocks, name), `Unexpected import ${name}`); return mocks[name];
  });
  return loaded.exports;
}
const noop = () => null;
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  return tree && typeof tree === "object" ? text(tree.props?.children) : "";
}

// Exercise actual toggle handlers with independent hook slots for both fields.
const state = [];
let cursor = 0;
const hooks = { ...React, useId: () => "generated-password-id", useState: initial => {
  const index = cursor++;
  if (!(index in state)) state[index] = initial;
  return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
} };
const password = load("src/components/ui/password-input.tsx", {
  "lucide-react": { Eye: noop, EyeOff: noop }, "@/components/ui/button": { Button: noop },
  "@/components/ui/form-input": { Input: noop }, "@/lib/utils": { cn },
}, hooks);
const props = name => ({ id: `test-${name}`, name, minLength: 8, maxLength: 72, required: true, autoComplete: "new-password", defaultValue: "Test12345" });
function fields() {
  cursor = 0;
  return ["password", "confirmPassword"].map(name => nodes(password.PasswordInput(props(name))));
}
let [first, second] = fields();
const control = field => field.find(node => node.props?.["aria-pressed"] !== undefined);
const input = field => field.find(node => node.props?.name);
assert.equal(input(first).props.type, "password");
assert.equal(input(second).props.type, "password");
assert.equal(control(first).props["aria-label"], "Show password");
assert.equal(control(second).props["aria-label"], "Show confirm password");
assert.equal(control(first).props.type, "button", "Toggling must not submit the form");
control(first).props.onClick();
[first, second] = fields();
assert.equal(input(first).props.type, "text");
assert.equal(input(second).props.type, "password", "Visibility must be independent");
assert.equal(control(first).props["aria-pressed"], true);
assert.equal(control(first).props["aria-controls"], "test-password");
assert.equal(control(first).props["aria-label"], "Hide password");
control(first).props.onClick(); control(second).props.onClick();
[first, second] = fields();
assert.equal(input(first).props.type, "password"); assert.equal(input(second).props.type, "text");
for (const field of [first, second]) {
  for (const [key, value] of Object.entries({ minLength: 8, maxLength: 72, required: true, autoComplete: "new-password", defaultValue: "Test12345" })) assert.equal(input(field).props[key], value);
  assert(input(field).props.className.includes("pr-12"));
}
cursor = 0;
assert(control(nodes(password.PasswordInput({ ...props("password"), disabled: true }))).props.disabled);
const form = load("src/app/(protected)/admin/users/create-account-form.tsx", {
  "@/components/ui/form": { Form: noop }, "@/components/ui/disclosure": { Disclosure: noop, DisclosureSummary: noop },
  "@/components/ui/label": { Label: noop }, "@/components/ui/form-select": { FormSelect: noop, SelectOption: noop },
  "react-dom": { useFormStatus: () => ({ pending: false }) }, "@/components/ui/form-input": { Input: noop },
  "@/components/ui/password-input": password, "@/components/ui/button": { Button: noop }, "../actions": { createAccount: noop },
}, { ...React, useActionState: () => [{ error: "" }, noop] });
const wired = nodes(form.CreateAccountForm()).filter(node => node.type === password.PasswordInput);
assert.deepEqual(wired.map(node => node.props.name), ["password", "confirmPassword"]);
for (const node of wired) assert(node.props.required && node.props.autoComplete === "new-password");

// Screenshot scenario: 14 retained profiles, 9 deleted customers, 5 current users.
const profiles = [
  { id: "admin1", role: "admin" }, { id: "admin2", role: "admin" },
  { id: "staff", role: "staff" }, { id: "rider", role: "delivery" }, { id: "customer", role: "customer" },
  ...Array.from({ length: 9 }, (_, index) => ({ id: `deleted-${index}`, role: "customer", deleted_at: "2026-11-06" })),
].map(row => ({ full_name: row.id, email: `${row.id}@example.invalid`, phone: null, deleted_at: null, is_active: row.id !== "customer", ...row }));
const before = JSON.stringify(profiles);
let fail = false;
let truncate = false;
const filters = [];
const client = { from: table => {
  let deletedFilter = false;
  const query = {
    select: () => query, gte: () => query, lt: () => query, order: () => query, eq: () => query,
    is: (column, value) => { assert.equal(table, "profiles"); assert.equal(column, "deleted_at"); assert.equal(value, null); deletedFilter = true; filters.push(table); return query; },
    then: (resolve, reject) => {
      const rows = table === "profiles" ? profiles.filter(row => !deletedFilter || row.deleted_at === null) : [];
      return Promise.resolve({ data: truncate && table === "profiles" ? rows.slice(0, 1) : rows, count: rows.length, error: fail ? { message: "unavailable" } : null }).then(resolve, reject);
    },
  };
  return query;
} };
const report = load("src/app/(protected)/admin/reports/page.tsx", {
  "next/link": { default: noop }, "@/components/ui/button": { Button: noop },
  "@/components/ui/card": Object.fromEntries(["Card", "CardContent", "CardHeader", "CardTitle"].map(name => [name, noop])),
  "@/lib/supabase/server": { createClient: async () => client }, "@/lib/report-order-trend": { dailyOrderCounts: () => [] },
  "@/components/report-charts": { BestSellersChart: noop, OrderStatusChart: noop, OrderVolumeTrend: noop },
});
const reportText = text(await report.default());
for (const value of ["5 registered accounts", "Registered customers1", "Total users5", "Staff1", "Riders1", "Admins2"]) assert(reportText.includes(value), value);
assert(reportText.includes("Deleted accounts are excluded"));
assert.equal(filters.length, 1);
const users = load("src/app/(protected)/admin/users/page.tsx", {
  "@/components/ui/form": { Form: noop }, "@/components/ui/form-select": { FormSelect: noop, SelectOption: noop },
  "@/components/ui/table": Object.fromEntries(["Table", "TableHeader", "TableRow", "TableHead", "TableBody", "TableCell"].map(name => [name, noop])),
  "@/components/ui/label": { Label: noop }, "@/components/ui/button": { Button: noop }, "@/components/ui/form-input": { Input: noop },
  "@/lib/auth": { requireRole: async () => ({ user: { id: "admin1" } }) }, "@/lib/supabase/server": { createClient: async () => client },
  "../actions": { updateProfile: noop }, "./delete-account-button": { AccountDeletionFeedback: noop, DeleteAccountButton: noop },
  "./create-account-form": { CreateAccountForm: noop },
});
const userText = text(await users.default({ searchParams: Promise.resolve({}) }));
for (const value of ["Administrator accounts2", "Staff accounts1", "Delivery accounts1", "Customer accounts1"]) assert(userText.includes(value), value);
assert(!userText.includes("deleted-"));
assert.equal(filters.length, 2);
const searched = text(await users.default({ searchParams: Promise.resolve({ q: "customer", role: "customer" }) }));
assert(searched.includes("Administrator accounts2") && searched.includes("Customer accounts1"), "Search must not alter global account summaries");
assert.equal(JSON.stringify(profiles), before, "Reports must not mutate historical profiles");
fail = true;
assert(text(await report.default()).includes("The full report could not be loaded"));
fail = false; truncate = true;
assert(text(await report.default()).includes("The full report could not be loaded"));
console.log("PASS admin users: both real password controls toggle independently with accessible non-submit buttons and preserved constraints; create form wiring; 14 retained/9 deleted => 5 current accounts, role counts match User Management including inactive users, search-independent summaries, error/truncation fail-closed. Mocked state/database only; no live writes.");
