import assert from "node:assert/strict";
import fs from "node:fs";
import * as promises from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import ts from "typescript";
import sharp from "sharp";

function load(file, mocks) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, name => {
    assert(Object.hasOwn(mocks, name), `Unexpected import ${name}`); return mocks[name];
  });
  return loaded.exports;
}
const assets = JSON.parse(fs.readFileSync("src/lib/menu-photo-assets.json", "utf8"));
assert.equal(assets.length, 67);
assert.equal(new Set(assets.map(asset => asset.key)).size, 67);
for (const asset of assets) {
  assert.match(asset.key, /^[a-z0-9-]+$/);
  const bytes = fs.readFileSync(`public/prepared-menu-photos/${asset.key}.webp`);
  assert.equal(bytes.length, asset.bytes);
  assert(bytes.length > 0 && bytes.length < 1_000_000);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert(metadata.width <= 1100 && metadata.height <= 1100);
}
const matching = load("src/lib/menu-photo-matching.ts", { "./menu-photo-assets.json": assets });
const { matchMenuPhotos } = matching;
const chicken = assets.find(asset => asset.source === "CHICKEN/Fried Chicken.png");
const item = () => ({ id: "item-1", name: "Fried Chicken", image_url: null, approval_status: "approved", price: 450, stock: 15 });
const status = rows => matchMenuPhotos(rows).find(match => match.key === chicken.key).status;
assert.equal(status([item()]), "ready");
assert.equal(status([{ ...item(), image_url: "https://existing.invalid/photo.jpg" }]), "existing");
assert.equal(status([item(), { ...item(), id: "duplicate" }]), "ambiguous");
assert.equal(status([]), "missing");
assert.equal(status([{ ...item(), approval_status: "pending" }]), "review");
assert.equal(status([{ ...item(), name: "Fried Chicken Bilao" }]), "missing");
assert.equal(status([{ ...item(), name: "Fried Chicken w/ Vegetables - HongKong Style" }]), "missing");
const conflict = matchMenuPhotos([item()], [chicken, { ...chicken, key: "other" }]);
assert(conflict.every(match => match.status === "ambiguous"));
assert(matchMenuPhotos([item()]).filter(match => !assets.find(asset => asset.key === match.key).names.length).every(match => match.status === "review"));

const imageSize = load("src/lib/image-upload.ts", {});
const validation = load("src/lib/validate-image.ts", { "server-only": {}, "@/lib/image-upload": imageSize });
const importer = load("src/lib/menu-photo-upload.ts", {
  "server-only": {}, "node:fs/promises": promises, "node:path": path, "node:crypto": crypto,
  "@/lib/menu-photo-matching": matching, "@/lib/validate-image": validation,
});
function setup(options = {}) {
  const rows = options.rows ?? [item()];
  const calls = [];
  const client = {
    from(table) {
      assert.equal(table, "menu_items", "No inventory/variants/orders writes or reads");
      const filters = []; let payload;
      const query = {
        select(fields) { assert(["id, name, image_url, approval_status", "id"].includes(fields)); return query; },
        order() { return query; }, range(from, to) { assert.equal(to - from, 199); return query; },
        update(value) { assert.deepEqual(Object.keys(value), ["image_url"]); payload = value; return query; },
        eq(field, value) { filters.push([field, value]); return query; },
        is(field, value) { assert.equal(value, null); filters.push([field, value]); return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (!payload) return { data: options.readError ? null : rows, error: options.readError ? { message: "private" } : null };
            calls.push(["update", payload]);
            if (options.writeError) return { data: null, error: { message: "private" } };
            if (options.transportError) throw Error("network");
            const found = options.race ? [] : rows.filter(row => filters.every(([key, value]) => row[key] === value));
            for (const row of found) row.image_url = payload.image_url;
            return { data: found.map(row => ({ id: row.id })), error: null };
          }).then(resolve, reject);
        },
      };
      return query;
    },
    storage: { from(bucket) {
      assert.equal(bucket, "menu-photos");
      return {
        upload: async (name, bytes, settings) => {
          assert.match(name, /^[0-9a-f-]{36}\.webp$/);
          assert(bytes.length < 1_000_000);
          assert.deepEqual(settings, { contentType: "image/webp", upsert: false });
          calls.push(["upload", name]); return { error: options.uploadError ? { message: "private" } : null };
        },
        getPublicUrl: name => ({ data: { publicUrl: `https://storage.invalid/${name}` } }),
        remove: async names => { calls.push(["remove", names]); return { error: options.cleanupError ? {} : null }; },
      };
    } },
  };
  return { rows, calls, client };
}
{
  const test = setup(); const before = { ...test.rows[0] };
  assert((await importer.uploadMatchedMenuPhoto(test.client, chicken.key, "item-1")).ok);
  assert(test.rows[0].image_url.startsWith("https://storage.invalid/"));
  assert.deepEqual({ ...test.rows[0], image_url: null }, before);
  const uploaded = test.calls.length;
  assert(!(await importer.uploadMatchedMenuPhoto(test.client, chicken.key, "item-1")).ok);
  assert.equal(test.calls.length, uploaded, "Retry must preserve stored photo and not upload twice");
}
{
  const test = setup({ rows: [{ ...item(), image_url: "" }] });
  assert((await importer.uploadMatchedMenuPhoto(test.client, chicken.key, "item-1")).ok);
}
for (const options of [{ uploadError: true }, { writeError: true }, { race: true }, { race: true, cleanupError: true }]) {
  const test = setup(options);
  const result = await importer.uploadMatchedMenuPhoto(test.client, chicken.key, "item-1");
  assert(!result.ok); assert(!result.message.includes("private"));
  assert.equal(test.rows[0].image_url, null);
  if (options.race) assert(test.calls.some(([name]) => name === "remove"));
  if (options.writeError) assert(!test.calls.some(([name]) => name === "remove"), "Ambiguous persistence must retain uploaded object");
}
for (const [key, id, rows] of [["../../secret", "item-1", [item()]], [chicken.key, "wrong-id", [item()]], [chicken.key, "item-1", [item(), { ...item(), id: "duplicate" }]], [chicken.key, "item-1", [{ ...item(), image_url: "old-photo" }]]]) {
  const test = setup({ rows });
  assert(!(await importer.uploadMatchedMenuPhoto(test.client, key, id)).ok);
  assert.equal(test.calls.length, 0);
}
{
  const test = setup({ readError: true });
  await assert.rejects(importer.uploadMatchedMenuPhoto(test.client, chicken.key, "item-1"));
  assert.equal(test.calls.length, 0);
}
{
  const test = setup({ transportError: true });
  await assert.rejects(importer.uploadMatchedMenuPhoto(test.client, chicken.key, "item-1"));
  assert(!test.calls.some(([name]) => name === "remove"));
}
let uploads = 0;
let invalidations = 0;
let admin = false;
const actions = load("src/app/(protected)/admin/menu/photos/actions.ts", {
  "next/cache": { revalidatePath: () => invalidations++ },
  "@/lib/auth": { requireRole: async roles => { assert.deepEqual(roles, ["admin"]); if (!admin) throw Error("denied"); } },
  "@/lib/supabase/server": { createClient: async () => ({}) },
  "@/lib/menu-photo-upload": { uploadMatchedMenuPhoto: async () => { uploads++; return { ok: true, message: "Saved" }; } },
});
await assert.rejects(actions.importMenuItemPhoto(chicken.key, "item-1"), /denied/);
assert.equal(uploads, 0);
admin = true;
assert((await actions.importMenuItemPhoto(chicken.key, "item-1")).ok);
assert.equal(uploads, 1); assert(invalidations > 0);
console.log("PASS 67 compressed images decoded/hash/size checked; exact recipe matching; duplicate/ambiguous/unapproved/missing/existing skips; unique upload + image-only database save; retry, blank URLs, concurrent-write protection, storage/read/save failures, conservative cleanup, admin-only action and view invalidation. Mocked Supabase only; no live database/storage mutations.");
