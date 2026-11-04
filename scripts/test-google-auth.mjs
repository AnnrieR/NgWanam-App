import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(path, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, name => {
    assert(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`);
    return mocks[name];
  });
  return loaded.exports;
}
const helpers = load("src/lib/google-auth.ts");
const original = { enabled: process.env.GOOGLE_AUTH_ENABLED, site: process.env.AUTH_SITE_URL };
try {
  delete process.env.GOOGLE_AUTH_ENABLED;
  assert.equal(helpers.googleAuthEnabled(), false);
  process.env.GOOGLE_AUTH_ENABLED = "true";
  assert.equal(helpers.googleAuthEnabled(), true);
  for (const site of ["", "javascript:alert(1)", "http://evil.example", "https://user:pass@example.com", "https://app.example.com/other", "https://app.example.com?x=1", "https://app.example.com/#x"]) {
    process.env.AUTH_SITE_URL = site;
    assert.throws(() => helpers.googleCallbackUrl());
  }
  for (const site of ["https://app.example.com", "http://localhost:3001", "http://127.0.0.1:3001"]) {
    process.env.AUTH_SITE_URL = site;
    assert.equal(helpers.googleCallbackUrl(), `${site}/auth/google/callback`);
  }
  const user = { id: "existing-user", email: "owner@gmail.com", identities: [{ provider: "google", identity_data: { email: "OWNER@gmail.com", email_verified: true } }] };
  assert(helpers.verifiedGoogleIdentity(user));
  for (const verified of [false, "true", undefined, null, 1]) {
    assert(!helpers.verifiedGoogleIdentity({ ...user, identities: [{ provider: "google", identity_data: { email: user.email, email_verified: verified } }] }));
  }
  assert(!helpers.verifiedGoogleIdentity({ ...user, identities: [] , user_metadata: { email_verified: true } }));
  assert(!helpers.verifiedGoogleIdentity({ ...user, email: "other@gmail.com" }));

  function setup(options = {}) {
    const calls = [];
    const auth = {
      getUser: async () => ({ data: { user: options.loggedIn ? user : null } }),
      signInWithOAuth: async () => { calls.push("oauth"); return { data: { url: "https://auth.example/authorize" }, error: null }; },
      linkIdentity: async () => { calls.push("link"); return { data: { url: "https://accounts.google.com/authorize" }, error: null }; },
    };
    const exports = load("src/app/auth/google/actions.ts", {
      "@supabase/supabase-js": { createClient: () => ({
        auth: {
          signInWithPassword: async () => { calls.push("password"); return { data: { user: options.wrongUser ? { id: "different" } : user }, error: options.wrongPassword ? {} : null }; },
          signOut: async () => { calls.push("signout-transient"); },
        },
        rpc: async () => { calls.push("approve"); return { error: options.denied ? {} : null }; },
      }) },
      "next/headers": { cookies: async () => ({ set: () => calls.push("flow-cookie") }) },
      "next/navigation": { redirect: url => { calls.push("redirect"); throw new Error(`REDIRECT:${url}`); } },
      "@/lib/supabase/server": { createClient: async () => ({ auth, rpc: async () => ({ data: !options.noGuard, error: null }) }) },
      "@/lib/google-auth": { ...helpers, googleAuthEnabled: () => !options.disabled },
    });
    return { run: exports.startGoogle, calls };
  }
  const linkForm = () => { const f = new FormData(); f.set("link", "yes"); f.set("consent", "yes"); f.set("password", "fixture-only"); return f; };
  for (const options of [{ disabled: true }, { noGuard: true }, { loggedIn: true }]) {
    const test = setup(options);
    assert((await test.run({}, new FormData())).error);
    assert(!test.calls.includes("oauth"));
  }
  for (const options of [{}, { loggedIn: true, wrongPassword: true }, { loggedIn: true, wrongUser: true }, { loggedIn: true, denied: true }]) {
    const test = setup(options);
    assert((await test.run({}, linkForm())).error);
    assert(!test.calls.includes("link"));
  }
  const noConsent = setup({ loggedIn: true }); const form = linkForm(); form.delete("consent");
  assert((await noConsent.run({}, form)).error); assert(!noConsent.calls.includes("password"));
  const linking = setup({ loggedIn: true });
  await assert.rejects(linking.run({}, linkForm()), /REDIRECT:https:\/\/accounts.google.com/);
  assert.deepEqual(linking.calls, ["password", "approve", "signout-transient", "link", "flow-cookie", "redirect"]);
  const login = setup();
  await assert.rejects(login.run({}, new FormData()), /REDIRECT:https:\/\/auth.example/);
  assert.deepEqual(login.calls, ["oauth", "flow-cookie", "redirect"]);
  async function callback(options = {}) {
    const calls = []; let reads = 0;
    const client = {
      rpc: async () => ({ data: !options.noGuard, error: null }),
      auth: {
        getUser: async () => ({ data: { user: reads++ === 0 ? { id: "existing-user" } : options.mismatched ? { ...user, id: "other-user" } : options.unverified ? { ...user, identities: [] } : user } }),
        exchangeCodeForSession: async () => { calls.push("exchange"); return { error: options.exchangeError ? {} : null }; },
        signOut: async () => { calls.push("signout"); },
      },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: "customer", is_active: !options.inactive } }) }) }) }),
    };
    const route = load("src/app/auth/google/callback/route.ts", {
      "next/headers": { cookies: async () => ({ get: () => ({ value: options.noFlow ? undefined : options.linking ? "link" : "login" }), delete: () => calls.push("clear-flow") }) },
      "next/server": { NextResponse: { redirect: url => ({ url: url.toString() }) } },
      "@/lib/supabase/server": { createClient: async () => client },
      "@/lib/google-auth": { ...helpers, googleAuthEnabled: () => !options.disabled },
      "@/lib/auth": { roleHome: () => "/home" },
    });
    const url = new URL(`http://localhost:3001/auth/google/callback${options.noCode ? "" : options.providerError ? "?error=access_denied" : "?code=pkce-code"}`);
    return { result: await route.GET({ url: url.toString(), nextUrl: url }), calls };
  }
  for (const options of [{ disabled: true }, { noFlow: true }, { noCode: true }, { providerError: true }, { noGuard: true }]) {
    const test = await callback(options);
    assert(test.result.url.endsWith("/login?error=google-failed"));
    assert(!test.calls.includes("exchange"));
  }
  for (const options of [{ exchangeError: true }, { unverified: true }, { linking: true, mismatched: true }]) {
    const test = await callback(options);
    assert(test.result.url.endsWith("error=google-failed"));
    if (!options.exchangeError) assert(test.calls.includes("signout"));
  }
  assert((await callback()).result.url.endsWith("/home"));
  assert((await callback({ linking: true })).result.url.endsWith("/account/security?linked=1"));
  const inactive = await callback({ inactive: true });
  assert(inactive.result.url.endsWith("/login?error=account-inactive")); assert(inactive.calls.includes("signout"));
  console.log("PASS Google feature/guard gates, fixed-origin redirects, strict provider email verification, consent/password/owner checks, rejected approvals, explicit linking sequence, OAuth start, PKCE callback failures, linked-owner validation, active-profile gate and success routing. Mocked services; no live Google or database calls.");
} finally {
  for (const [name, value] of [["GOOGLE_AUTH_ENABLED", original.enabled], ["AUTH_SITE_URL", original.site]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
}
