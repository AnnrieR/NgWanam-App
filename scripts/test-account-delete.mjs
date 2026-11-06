import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("src/app/(protected)/admin/actions.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const target = "20000000-0000-0000-0000-000000000001";
const actor = "10000000-0000-0000-0000-000000000001";
function setup(options = {}) {
  const calls = [];
  const admin = {
    auth: { admin: { deleteUser: async (id, soft) => {
      calls.push(["delete-auth", id, soft]);
      if (options.throwAuth) throw Error("private-provider-payload");
      return { error: options.authError ?? null };
    } } },
    from: () => ({ update: value => {
      calls.push(["profile", value]);
      return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: target }, error: options.profileError ?? null }) }) }) };
    } }),
    storage: { from: () => ({
      list: async () => { calls.push(["avatars"]); if (options.throwAvatar) throw Error("private-avatar-payload"); return { data: [{ name: "photo.webp" }], error: null }; },
      remove: async paths => { calls.push(["remove-avatars", paths]); return { error: null }; },
    }) },
  };
  const mocks = {
    "next/cache": { revalidatePath: path => calls.push(["refresh", path]) },
    "next/navigation": { redirect: () => { throw Error("Unexpected delete redirect"); } },
    "@/lib/auth": { requireRole: async roles => { calls.push(["role", roles]); if (options.denied) throw Error("Access denied"); return { user: { id: actor } }; } },
    "@/lib/supabase/server": { createClient: async () => ({ rpc: async (name, args) => { calls.push(["guard", name, args]); return { error: options.guardError ?? null }; } }) },
    "@/lib/supabase/admin": { createAdminClient: () => { calls.push(["admin-config"]); if (options.noConfig) throw Error("private-env-value"); return admin; } },
  };
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, name => {
    assert(Object.hasOwn(mocks, name), `Unexpected dependency ${name}`); return mocks[name];
  });
  return { run: loaded.exports.deleteAccount, calls };
}
function form(patch = {}) {
  const f = new FormData(); for (const [k,v] of Object.entries({ profileId: target, confirmed: "yes", ...patch })) f.set(k,v); return f;
}
const logs = []; const originalError = console.error;
console.error = (...args) => logs.push(args);
try {
  const denied = setup({ denied: true }); await assert.rejects(denied.run(form()), /Access denied/);
  assert.equal(denied.calls.length, 1);
  for (const patch of [{ profileId: "bad" }, { profileId: actor }, { confirmed: "no" }]) {
    const test = setup(); assert.equal((await test.run(form(patch))).ok, false); assert.equal(test.calls.length, 1);
  }
  const config = setup({ noConfig: true }); assert.equal((await config.run(form())).ok, false);
  assert(!config.calls.some(([name]) => name === "guard"));
  for (const message of ["unfinished-work", "last-admin", "account-not-found", "permission denied"]) {
    const test = setup({ guardError: { code: "42501", message } });
    assert.equal((await test.run(form())).ok, false);
    assert(!test.calls.some(([name]) => name === "delete-auth"));
  }
  const auth = setup({ authError: { code: "unexpected_failure", status: 500, message: "private-email@example.com secret-token" } });
  const failure = await auth.run(form()); assert(!failure.ok && failure.reference.includes("/auth/"));
  assert(!auth.calls.some(([name]) => name === "profile"));
  const profile = setup({ profileError: { code: "42501" } });
  assert.equal((await profile.run(form())).ok, false);
  assert(!profile.calls.some(([name]) => name === "avatars"));
  const thrown = setup({ throwAuth: true }); assert.equal((await thrown.run(form())).ok, false);
  const success = setup(); assert.deepEqual(await success.run(form()), { ok: true });
  assert.deepEqual(success.calls.find(([name]) => name === "delete-auth"), ["delete-auth", target, true]);
  const scrub = success.calls.find(([name]) => name === "profile")[1];
  assert.equal(scrub.is_active, false); assert(scrub.deleted_at); assert.equal(scrub.full_name, "Deleted account");
  assert.equal(scrub.email, `deleted-${target}@removed.invalid`); assert.equal(scrub.phone, null);
  assert(success.calls.some(([name]) => name === "refresh"));
  assert(success.calls.some(([name, path]) => name === "refresh" && path === "/admin/reports"));
  const avatarFailure = await setup({ throwAvatar: true }).run(form());
  assert(avatarFailure.ok && avatarFailure.warning.includes("avatar cleanup"));
  const serialized = JSON.stringify(logs);
  for (const secret of ["private-email", "secret-token", "private-env-value", "private-provider-payload", target, actor]) assert(!serialized.includes(secret), `Log leak: ${secret}`);
  const ui = fs.readFileSync("src/app/(protected)/admin/users/delete-account-button.tsx", "utf8");
  assert(ui.includes('role="alert"') && ui.includes('role="status"'));
  assert(ui.includes("if (lockRef.current) return") && ui.includes("router.refresh()"));
  assert(ui.includes("result.reference") && ui.includes('name="confirmed" value="yes"'));
  console.log("PASS account-delete action: admin/self/confirmation guards, configuration before deactivation, unfinished work/last admin/missing account, Auth/profile failures, soft-delete-only success, anonymization, refresh, retryable inline errors and sanitized server diagnostics. Mocked services only; no live account deletions.");
} finally {
  console.error = originalError;
}
