// Offline mocked-provider regression tests; never reads .env or calls Google.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, imports = {}, extra = {}) {
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module: compiled, exports: compiled.exports,
    require(name) { if (name === "server-only") return {}; if (name in imports) return imports[name]; throw new Error(`Unexpected import ${name}`); },
    console: { warn() {} }, AbortSignal, ...extra,
  }, { filename: path });
  return compiled.exports;
}
const helpers = load("src/lib/chat-assistant.ts");
const tracking = load("src/lib/chat-order-tracking.ts");
const secret = "test-server-only-key-not-a-real-key";
const env = { GEMINI_API_KEY: secret };
let calls = 0;
let mode = "ok";
let requestBody;
const gemini = load("src/lib/gemini.ts", { "@/lib/chat-assistant": helpers }, {
  process: { env },
  fetch: async (url, options) => {
    calls++;
    assert(!url.includes(secret));
    assert.equal(options.headers["x-goog-api-key"], secret);
    assert.equal(options.cache, "no-store");
    requestBody = JSON.parse(options.body);
    assert(!("tools" in requestBody), "No model write tools");
    assert(!JSON.stringify(requestBody).includes("customer_id"));
    if (mode === "network") throw new Error("simulated timeout");
    if (mode === "429") return { ok: false, status: 429 };
    if (mode === "badjson") return { ok: true, json: async () => { throw new Error("bad json"); } };
    const finishReason = mode === "truncated" ? "MAX_TOKENS" : "STOP";
    const text = mode === "invalid" ? "not json" : JSON.stringify({ topic: "general", text: "Verified restaurant answer" });
    return { ok: true, json: async () => ({ candidates: [{ finishReason, content: { parts: [{ text }] } }] }) };
  },
});
assert.equal(helpers.parseGeminiAnswer(null), null);
assert.equal(helpers.parseGeminiAnswer({ promptFeedback: { blockReason: "SAFETY" } }), null);
assert.equal(helpers.redactChatQuestion("Contact test@example.com 09123456789"), "Contact [email removed] [phone removed]");
assert.equal(helpers.redactChatQuestion("Order #245"), "Order #245");
assert.equal(tracking.trackingOrderNumber("order #245"), "245");
const answer = await gemini.generateSupportAnswer("My email test@example.com and phone 09123456789", { menuComplete: true, menu: [] });
assert.equal(answer.text, "Verified restaurant answer");
assert(!JSON.stringify(requestBody).includes("test@example.com"));
assert(!JSON.stringify(requestBody).includes("09123456789"));
assert.equal(requestBody.generationConfig.maxOutputTokens, 700);
for (mode of ["network", "429", "badjson", "truncated", "invalid"]) assert.equal(await gemini.generateSupportAnswer("menu?", {}), null);
env.GEMINI_ENABLED = "false";
const before = calls;
assert.equal(await gemini.generateSupportAnswer("menu?", {}), null);
assert.equal(calls, before);
env.GEMINI_ENABLED = "true";
env.GEMINI_MODEL = "../../unexpected-host";
assert.equal(gemini.geminiConfiguration(), null);
delete env.GEMINI_MODEL;
assert.equal(await gemini.generateSupportAnswer("menu?", { huge: "x".repeat(61000) }), null);
assert.equal(calls, before);

let loggedIn = true, active = true, allowed = true, aiCalls = 0, budgetCalls = 0;
let aiAnswer = { topic: "general", text: "AI menu answer" };
let ownerFilter;
const supabase = {
  auth: { getUser: async () => ({ data: { user: loggedIn ? { id: "own-customer" } : null } }) },
  from: (table) => {
    if (table === "profiles") return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: "customer", is_active: active } }) }) }) };
    assert.equal(table, "orders");
    const query = {
      eq: (column, value) => { if (column === "customer_id") ownerFilter = value; return query; },
      in: () => query, order: () => query, limit: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return { select: () => query };
  },
  rpc: async () => ({ data: "Saved FAQ response", error: null }),
};
const actions = load("src/app/(protected)/chatbot/actions.ts", {
  "@/lib/supabase/server": { createClient: async () => supabase },
  "@/lib/embedded": { one: (value) => Array.isArray(value) ? value[0] : value },
  "@/lib/chat-order-tracking": tracking,
  "@/lib/chat-assistant": helpers,
  "@/lib/gemini": { geminiConfiguration: () => true, generateSupportAnswer: async () => { aiCalls++; return aiAnswer; } },
  "@/lib/chat-support-context": { getSupportContext: async () => ({ menu: [] }) },
  "@/lib/chat-ai-budget": { reserveChatAiAttempt: async () => { budgetCalls++; return allowed; } },
});
assert.equal((await actions.askAssistant({ question: "fake" })).source, "fallback");
assert.equal((await actions.askAssistant("x".repeat(501))).source, "fallback");
loggedIn = false;
assert.equal((await actions.askAssistant("menu?")).source, "fallback");
assert.equal((await actions.askAssistant("track order 999")).href, "/login");
assert.equal(aiCalls, 0); assert.equal(budgetCalls, 0);
loggedIn = true; active = false;
assert.equal((await actions.askAssistant("menu?")).source, "fallback");
assert.equal(aiCalls, 0);
active = true; allowed = false;
assert.equal((await actions.askAssistant("menu?")).source, "fallback");
assert.equal(aiCalls, 0);
assert.equal((await actions.askAssistant("track order 999")).source, "database");
assert.equal(ownerFilter, "own-customer"); assert.equal(aiCalls, 0);
allowed = true;
assert.equal((await actions.askAssistant("menu?")).source, "gemini");
aiAnswer = { topic: "order_tracking", text: "Must not display guessed status" };
const semantic = await actions.askAssistant("Naipadala na po ba ang binili ko?");
assert.equal(semantic.source, "database");
assert(!semantic.text.includes("guessed")); assert.equal(ownerFilter, "own-customer");
aiAnswer = null;
assert.equal((await actions.askAssistant("menu?")).source, "fallback");

let complete = true;
const ctxClient = {
  rpc: (name) => name === "get_restaurant_info" ? Promise.resolve({ data: [{ name: "Restaurant", address: "Public address", operating_hours: "Public hours", phone_numbers: ["public phone"], secret: "MUST_NOT_LEAK", delivery_fee: 999 }] }) : {
    select: () => ({ limit: async () => ({ data: [{ item_name: "Dish" }], count: complete ? 1 : 2, error: null }) }),
  },
  from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [{ name: "Area", fee: 70 }], count: complete ? 1 : 2, error: null }) }) }) }) }),
};
const context = load("src/lib/chat-support-context.ts");
let facts = await context.getSupportContext(ctxClient);
assert.equal(facts.menuComplete, true); assert.equal(facts.deliveryAreasComplete, true);
assert(!JSON.stringify(facts).includes("MUST_NOT_LEAK"));
assert(!JSON.stringify(facts).includes("delivery_fee"));
complete = false;
facts = await context.getSupportContext(ctxClient);
assert.equal(facts.menu, null); assert.equal(facts.deliveryAreas, null);
assert.equal(facts.menuComplete, false); assert.equal(facts.deliveryAreasComplete, false);
console.log("PASS Gemini parsing, redaction, timeout/network/429/truncation/disabled/malformed fallbacks, bounded requests, guest/inactive/budget gates, and ownership-filtered direct + semantic order intent. No live API calls.");
console.log("PASS public context allowlist and fail-closed incomplete menu/area datasets (no misleading partial totals).");
