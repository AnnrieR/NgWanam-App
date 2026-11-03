import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(filename, imports = {}) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'server-only') return {};
    if (name in imports) return imports[name];
    throw Error(`Unexpected test import: ${name}`);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const shared = load('src/lib/image-upload.ts');
const { validateImage } = load('src/lib/validate-image.ts', { '@/lib/image-upload': shared });
assert.equal(shared.validImageSize(0), false);
assert.equal(shared.validImageSize(1048575), true);
assert.equal(shared.validImageSize(1048576), false);
assert.equal(shared.validImageSize(1048577), false);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1cAAAAASUVORK5CYII=', 'base64');
assert.equal((await validateImage(new File([png], 'proof.png', { type: 'image/png' }))).type, 'png');
assert.equal(await validateImage(new File([png], 'fake.jpg', { type: 'image/jpeg' })), null);
assert.equal(await validateImage(new File(['plain text'], 'fake.png', { type: 'image/png' })), null);
assert.equal(await validateImage(new File([Buffer.alloc(1048576)], 'large.png', { type: 'image/png' })), null);
assert.equal(await validateImage(new File([], 'empty.png', { type: 'image/png' })), null);
console.log('PASS strict <1 MB boundary, PNG signature/MIME agreement, fake/empty/oversized rejection.');
