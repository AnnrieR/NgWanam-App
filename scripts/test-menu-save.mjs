import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("src/app/menu/actions.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const id = "10000000-0000-0000-0000-000000000001";
function setup(options = {}) {
  const calls = { roles: [], rpc: [], updates: [], uploads: [], removed: [], refreshed: [] };
  const client = {
    rpc: async (name, payload) => { calls.rpc.push({ name, payload }); return { error: options.rpcError ?? null }; },
    from: table => {
      let updating = false;
      const chain = {
        select: () => chain,
        eq: () => chain,
        update: payload => { updating = true; calls.updates.push({ table, payload }); return chain; },
        single: async () => updating
          ? { data: options.updateError ? null : { id }, error: options.updateError ?? null }
          : { data: options.readError ? null : { image_url: "https://storage.test/menu-photos/old.png" }, error: options.readError ?? null },
      };
      return chain;
    },
    storage: { from: bucket => ({
      upload: async (path, bytes) => { calls.uploads.push({ bucket, path, size: bytes.length }); return { error: options.uploadError ?? null }; },
      getPublicUrl: path => ({ data: { publicUrl: `https://storage.test/${bucket}/${path}` } }),
      remove: async paths => { calls.removed.push(...paths); return { error: null }; },
    }) },
  };
  const result = { exports: {} };
  const mocks = {
    "next/cache": { revalidatePath: p => calls.refreshed.push(p) },
    "next/navigation": { redirect: () => { throw Error("Unexpected navigation on save"); } },
    "@/lib/auth": { requireRole: async roles => { calls.roles.push(roles); if (options.denied) throw Error("Access denied"); return { profile: { role: options.role ?? "admin" } }; } },
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/validate-image": { validateImage: async file => options.invalidImage || file.size >= 1048576 ? null : { bytes: Buffer.from(await file.arrayBuffer()), type: "png" } },
  };
  new Function("module", "exports", "require", compiled)(result, result.exports, name => {
    assert(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`);
    return mocks[name];
  });
  return { actions: result.exports, calls };
}
function form(patch = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ categoryId: id, menuItemId: id, variantId: id, itemName: "Test item", variantName: "Regular", servingLabel: "Good for 1", price: "100", isActive: "on", ...patch })) data.set(key, value);
  return data;
}
let groups = 0;
for (const role of ["admin", "staff"]) {
  const { actions, calls } = setup({ role });
  const result = await actions.createMenuEntry(form());
  assert(result.ok);
  assert.equal(result.message, role === "admin" ? "Menu item created successfully." : "Menu item submitted for admin approval.");
  assert.equal(calls.rpc[0].name, "create_menu_entry");
  assert.deepEqual(calls.roles[0], ["staff", "admin"]);
  assert(calls.refreshed.includes("/menu") && calls.refreshed.includes("/home"));
} groups++;
for (const patch of [{ price: "" }, { price: "-1" }, { price: "NaN" }, { categoryId: "invalid" }, { itemName: " " }]) {
  const { actions, calls } = setup();
  assert.equal((await actions.createMenuEntry(form(patch))).ok, false);
  assert.equal(calls.rpc.length, 0);
  assert.equal(calls.uploads.length, 0);
}
assert((await setup().actions.createMenuEntry(form({ price: "0" }))).ok); groups++;
for (const operation of ["createMenuCategory", "createMenuEntry", "updateMenuItem", "createMenuVariant", "updateMenuVariant"]) {
  const { actions, calls } = setup({ denied: true });
  await assert.rejects(actions[operation](form()), /Access denied/);
  assert.equal(calls.rpc.length + calls.updates.length + calls.uploads.length, 0);
} groups++;
for (const operation of ["createMenuEntry", "updateMenuItem"]) {
  const data = form(); data.set("image", new File(["not-an-image"], "invalid.png", { type: "image/png" }));
  const { actions, calls } = setup({ invalidImage: true });
  const result = await actions[operation](data);
  assert(!result.ok && result.error.includes("smaller than 1 MB"));
  assert.equal(calls.uploads.length + calls.rpc.length + calls.updates.length, 0);
  const oversized = form(); oversized.set("image", new File([new Uint8Array(1048576)], "large.png", { type: "image/png" }));
  assert.equal((await setup().actions[operation](oversized)).ok, false);
} groups++;
{
  const data = form(); data.set("image", new File(["png-fixture"], "image.png", { type: "image/png" }));
  const { actions, calls } = setup({ uploadError: { message: "Unavailable" } });
  assert.equal((await actions.createMenuEntry(data)).ok, false);
  assert.equal(calls.rpc.length, 0);
  const failed = setup({ rpcError: { message: "Duplicate" } });
  assert.equal((await failed.actions.createMenuEntry(data)).ok, false);
  assert.equal(failed.calls.removed[0], failed.calls.uploads[0].path);
  assert.equal(failed.calls.refreshed.length, 0);
} groups++;
{
  const data = form(); data.set("image", new File(["png-fixture"], "image.png", { type: "image/png" }));
  const failed = setup({ updateError: { message: "No permitted row" } });
  assert.equal((await failed.actions.updateMenuItem(data)).ok, false);
  assert.deepEqual(failed.calls.removed, [failed.calls.uploads[0].path]);
  assert(!failed.calls.removed.includes("old.png"));
  const saved = setup();
  assert((await saved.actions.updateMenuItem(data)).ok);
  assert.deepEqual(saved.calls.removed, ["old.png"]);
  assert(saved.calls.updates[0].payload.image_url.endsWith(saved.calls.uploads[0].path));
} groups++;
{
  const { actions, calls } = setup();
  assert((await actions.updateMenuItem(form())).ok);
  assert.equal(calls.updates[0].payload.image_url, "https://storage.test/menu-photos/old.png");
  assert.equal(calls.removed.length, 0);
  assert.equal((await setup({ readError: {} }).actions.updateMenuItem(form())).ok, false);
  assert.equal((await setup({ updateError: {} }).actions.updateMenuVariant(form())).ok, false);
} groups++;
for (const operation of ["createMenuCategory", "createMenuVariant", "updateMenuVariant"]) {
  const success = setup();
  assert((await success.actions[operation](form({ name: "New category" }))).ok);
  assert(success.calls.refreshed.includes("/menu"));
}
assert.equal((await setup({ rpcError: {} }).actions.createMenuCategory(form({ name: "Duplicate" }))).ok, false);
assert.equal((await setup({ rpcError: {} }).actions.createMenuVariant(form())).ok, false); groups++;
const ui = fs.readFileSync("src/app/menu/menu-crud.tsx", "utf8");
assert(ui.includes("event.preventDefault()") && ui.includes("if (lockRef.current) return"));
assert(ui.includes('<fieldset disabled={busy}') && ui.includes('aria-busy={busy}'));
assert(ui.includes('role="alert"') && ui.includes('role="status"') && ui.includes('aria-live="polite"'));
assert(!ui.includes("router.push") && !ui.includes("router.replace"));
assert(ui.includes("if (!open && !busy) onClose()"));
const parsed = ts.createSourceFile("actions.ts", source, ts.ScriptTarget.Latest, true);
for (const node of parsed.statements) if (ts.isFunctionDeclaration(node) && ["createMenuCategory", "createMenuEntry", "updateMenuItem", "createMenuVariant", "updateMenuVariant"].includes(node.name?.text)) assert(!node.body.getText(parsed).includes("redirect("));
groups++;
console.log(`PASS ${groups} menu-save test groups: role guards, staff approval notice, inline results/no redirects, validation, strict size gate, upload failure/cleanup, persisted-row checks and UI preservation guards. Mocked services only; no database writes.`);
