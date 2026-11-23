// Offline: mocked actions/React state; never reads secrets or writes real data.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import * as icons from "lucide-react";

function load(file, mocks, hooks = React) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function("exports", "require", code)(loaded.exports, name => {
    if (name === "react") return hooks;
    if (name === "react/jsx-runtime") return jsx;
    assert(Object.hasOwn(mocks, name), `Unexpected import ${name}`);
    return mocks[name];
  });
  return loaded.exports;
}
const noop = () => null;
const id = "10000000-0000-0000-0000-000000000001";
let denied = false, rpcError = null;
const calls = [], refreshed = [];
const common = {
  "@/lib/auth": { requireRole: async roles => { calls.push(["roles", roles]); if (denied) throw Error("Denied"); } },
  "@/lib/supabase/server": { createClient: async () => ({ rpc: async (name, args) => { calls.push(["rpc", name, args]); return { error: rpcError }; } }) },
  "next/cache": { revalidatePath: path => refreshed.push(path) },
};
const actions = load("src/app/(protected)/admin/feedback/actions.ts", common);
function form(values) { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; }
for (const decision of ["approved", "private", "pending"]) {
  assert((await actions.moderateFeedback({}, form({ ratingId: id, decision, publicQuote: "Helpful rider." }))).saved);
  assert.deepEqual(calls.at(-1), ["rpc", "moderate_rider_feedback", { p_rating_id: id, p_decision: decision, p_public_quote: decision === "approved" ? "Helpful rider." : null }]);
  assert.deepEqual(calls.at(-2), ["roles", ["admin"]]);
}
assert(refreshed.includes("/") && refreshed.includes("/admin/feedback"));
for (const values of [{ ratingId: "bad", decision: "private" }, { ratingId: id, decision: "delete" }, { ratingId: id, decision: "approved", publicQuote: " " }, { ratingId: id, decision: "approved", publicQuote: "x".repeat(501) }]) {
  const before = calls.filter(call => call[0] === "rpc").length;
  assert((await actions.moderateFeedback({}, form(values))).error);
  assert.equal(calls.filter(call => call[0] === "rpc").length, before);
}
rpcError = { message: "Consent denied" };
assert((await actions.moderateFeedback({}, form({ ratingId: id, decision: "approved", publicQuote: "Quote" }))).error);
rpcError = null; denied = true;
await assert.rejects(actions.moderateFeedback({}, form({ ratingId: id, decision: "private" })), /Denied/);
denied = false;
const rating = load("src/app/(protected)/orders/[orderId]/rating-actions.ts", { ...common, "@/lib/revalidate-order-views": { revalidateOrderViews: noop } });
for (const allowPublic of ["", "on"]) {
  assert((await rating.submitDeliveryRating({}, form({ orderId: id, rating: "4", comment: "Helpful rider", allowPublic }))).saved);
  assert.deepEqual(calls.at(-1), ["rpc", "submit_delivery_rating_with_consent", { p_order_id: id, p_rating: 4, p_comment: "Helpful rider", p_allow_public: allowPublic === "on" }]);
  assert.deepEqual(calls.at(-2), ["roles", ["customer"]]);
}
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === "object" ? [tree, ...nodes(tree.props?.children)] : []; }
let stars = 0;
const component = load("src/components/delivery-rating-form.tsx", {
  "lucide-react": icons, "@/components/ui/form": { Form: noop }, "@/components/ui/label": { Label: noop },
  "@/components/ui/textarea": { Textarea: noop }, "@/components/ui/button": { Button: noop },
  "@/app/(protected)/orders/[orderId]/rating-actions": { submitDeliveryRating: noop },
}, { ...React, useState: () => [stars, value => { stars = value; }], useActionState: () => [{}, noop, false] });
const render = () => nodes(component.DeliveryRatingForm({ orderId: id, riderName: "Rider", existingRating: null, existingComment: null, canRate: true }));
for (const value of [1, 2, 3, 4, 5]) {
  render().find(node => node.props?.["aria-label"] === `${value} ${value === 1 ? "star" : "stars"}`).props.onClick();
  const tree = render();
  assert.equal(tree.find(node => node.props?.role === "status").props.children, `${value.toFixed(1)} / 5`);
  assert.equal(tree.find(node => node.props?.name === "rating").props.value, value);
  assert(!tree.find(node => node.props?.name === "allowPublic").props.defaultChecked);
}
const sql = fs.readFileSync("supabase/migrations/20261124010000_moderate_rider_feedback.sql", "utf8");
assert(sql.includes("default 'pending'") && sql.includes("default false"));
assert(sql.includes("p.role='admin'") && sql.includes("Only active administrators"));
assert(sql.includes("v_rating.rating<4") && sql.includes("not v_rating.allow_public"));
assert(sql.includes("r.review_status='approved' and r.allow_public and r.rating>=4"));
assert(!/delete from|truncate|drop table|set rating=|set comment=/i.test(sql));
assert(!sql.includes("create or replace function public.get_rider_rating_summaries"), "Internal averages must remain unchanged");
const publicReturn = sql.split("create function public.get_public_rider_testimonials()")[1].split("language sql")[0];
assert(!/customer_id|rider_id|order_number|full_name|phone|address|comment/.test(publicReturn));
const checkout = fs.readFileSync("src/app/(protected)/checkout/checkout-form.tsx", "utf8");
assert(checkout.includes('title: "GCash"') && !checkout.includes('title: "Manual GCash"'));
assert(checkout.includes("3. Payment Method") && checkout.includes("font-semibold"));
assert(fs.readFileSync("src/components/delivery-area-picker.tsx", "utf8").includes('selected ? "font-bold text-foreground"'));
assert(fs.readFileSync("src/app/page.tsx", "utf8").includes("<Hero address={restaurant?.address}"));
console.log("PASS panel revisions: admin/customer action guards, publish/private/pending transitions and errors, opt-in submission, numeric score 1.0–5.0 UI state, checkout label/highlights, address wiring, migration safety/source allowlists. Mocked services and SQL source checks only; not a real DB or hosted test.");
