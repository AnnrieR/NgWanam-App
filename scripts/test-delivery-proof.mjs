import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";

function load(file, mocks, extra = "") {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8") + extra, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, name => {
    assert(Object.hasOwn(mocks, name), `Unexpected import ${name}`); return mocks[name];
  });
  return loaded.exports;
}
const size = load("src/lib/image-upload.ts", {});
const validation = load("src/lib/validate-image.ts", { "server-only": {}, "@/lib/image-upload": size });
const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const png = () => new File([pngBytes], "proof.png", { type: "image/png" });
function setup(options = {}) {
  const calls = [];
  const storage = {
    upload: async (path, bytes, settings) => { calls.push(["upload", path, bytes.length, settings]); return { error: options.uploadError ? {} : null }; },
    remove: async paths => { calls.push(["remove", paths]); return { error: null }; },
  };
  const client = {
    storage: { from: bucket => { assert.equal(bucket, "delivery-proofs"); return storage; } },
    rpc: async (name, payload) => { assert.equal(name, "update_delivery_status"); calls.push(["rpc", payload]); return { error: options.rpcError ? {} : null }; },
    from: table => { assert.equal(table, "deliveries"); return { select: () => ({ eq: () => ({ single: async () => ({ data: { order_id: "order-id" } }) }) }) }; },
  };
  const actions = load("src/app/(protected)/delivery/actions.ts", {
    "next/cache": { revalidatePath: path => calls.push(["revalidate", path]) },
    "next/navigation": { redirect: path => { throw Error(`redirect:${path}`); } },
    "@/lib/auth": { requireRole: async roles => { assert.deepEqual(roles, ["delivery"]); if (options.denied) throw Error("denied"); return { user: { id: "rider-id" } }; } },
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/revalidate-order-views": { revalidateOrderViews: id => calls.push(["order-refresh", id]) },
    "@/lib/validate-image": validation,
  });
  return { run: actions.updateDeliveryStatus, calls };
}
function form(files = [], status = "delivered") {
  const data = new FormData(); data.set("deliveryId", "delivery-id"); data.set("nextStatus", status);
  for (const file of files) data.append("proofPhoto", file);
  return data;
}
for (const files of [[], [new File([], "", { type: "application/octet-stream" })]]) {
  const test = setup();
  await assert.rejects(test.run(form(files)), /redirect:\/delivery\/orders\?updated=1/);
  assert.deepEqual(test.calls.find(([name]) => name === "rpc")[1], { p_delivery_id: "delivery-id", p_next_status: "delivered", p_proof_photo_path: null });
  assert(!test.calls.some(([name]) => name === "upload" || name === "remove"));
  assert(test.calls.some(([name]) => name === "order-refresh"));
}
{
  const test = setup(); await assert.rejects(test.run(form([png()])), /updated=1/);
  const upload = test.calls.find(([name]) => name === "upload"); assert(upload);
  assert.match(upload[1], /^rider-id\/delivery-id\/[0-9a-f-]+\.png$/);
  assert.equal(test.calls.find(([name]) => name === "rpc")[1].p_proof_photo_path, upload[1]);
}
for (const files of [[png(), png()], [new File([], "empty.png", { type: "image/png" })], [new File(["fake"], "fake.png", { type: "image/png" })], [new File([new Uint8Array(1048576)], "large.png", { type: "image/png" })], ["not-a-file"]]) {
  const test = setup(); await assert.rejects(test.run(form(files)), /proof-invalid/);
  assert(!test.calls.some(([name]) => name === "rpc" || name === "upload"));
}
{
  const test = setup({ uploadError: true }); await assert.rejects(test.run(form([png()])), /proof-upload-failed/);
  assert(!test.calls.some(([name]) => name === "rpc"));
}
{
  const test = setup({ rpcError: true }); await assert.rejects(test.run(form()), /update-failed/);
  assert(!test.calls.some(([name]) => name === "remove"));
}
await assert.rejects(setup({ denied: true }).run(form()), /denied/);
{
  const test = setup(); await assert.rejects(test.run(form([], "out_for_delivery")), /updated=1/);
  assert.equal(test.calls.find(([name]) => name === "rpc")[1].p_next_status, "out_for_delivery");
}
const noop = () => null;
let pending = false;
const dialog = load("src/app/(protected)/delivery/orders/delivery-proof-dialog.tsx", {
  "react": { ...React, useState: initial => [initial, noop], useEffect: noop }, "react/jsx-runtime": jsx,
  "react-dom": { useFormStatus: () => ({ pending }) },
  "@/components/ui/form": { Form: noop }, "@/components/ui/label": { Label: noop }, "@/components/ui/form-input": { Input: noop },
  "@/components/ui/button": { Button: noop }, "@/app/(protected)/delivery/actions": { updateDeliveryStatus: noop },
  "lucide-react": { ImagePlus: noop, LoaderCircle: noop, X: noop },
  "@/components/ui/dialog": { Dialog: noop, DialogContent: noop, DialogTitle: noop, DialogDescription: noop },
}, "\nexport { ProofForm };\n");
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const render = () => nodes(dialog.ProofForm({ onClose: noop, pendingRef: { current: false }, titleId: "title", descriptionId: "description" }));
let tree = render();
assert(!tree.find(node => node.props?.name === "proofPhoto").props.required);
assert.equal(tree.find(node => node.props?.type === "submit").props.disabled, false, "No-photo confirmation must be enabled");
assert(JSON.stringify(tree).includes("Proof photo (optional)"));
pending = true; tree = render();
assert.equal(tree.find(node => node.props?.type === "submit").props.disabled, true);
console.log("PASS optional proof UI/action: no file/empty browser placeholder => null path/no Storage call; valid photo upload; invalid/multiple/oversize/named-empty/nonfile rejection; upload/RPC errors, authorization, existing delivery transition and view refresh. Mocked services only; no real delivery or stock changes.");
