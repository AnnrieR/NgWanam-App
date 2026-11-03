// Self-contained offline tests. Uses temporary synthetic env files, never live env.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = fs.mkdtempSync(path.join(process.env.SUPABASE_TEST_TMPDIR ?? os.tmpdir(), 'ngwanam-sb-config-'));
const run = (script, args = []) => execFileSync(process.execPath, [path.join(root, 'scripts', script), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const compose = file => JSON.parse(execFileSync('docker', ['compose', '-p', file.includes('second') ? 'ngwanam-test-b' : 'ngwanam-test-a', '--env-file', file, '-f', path.join(root, 'docker-compose.supabase.yml'), 'config', '--format', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
let count = 0;
try {
  const first = path.join(temporary, 'first.env');
  const args = ['--instance', 'ngwanam-test-a', '--api-domain', 'api.example.com', '--studio-domain', 'studio.example.com', '--site-url', 'https://app.example.com', '--admin-cidrs', '203.0.113.10/32', '--output', first];
  run('generate-env.mjs', args);
  run('validate.mjs', [first]); count++;
  assert.notEqual(spawnSync(process.execPath, [path.join(root, 'scripts/generate-env.mjs'), ...args], { stdio: 'ignore' }).status, 0, 'Generator overwrote existing secrets'); count++;
  const text = fs.readFileSync(first, 'utf8');
  for (const [name, changed] of [
    ['allow-all CIDR', text.replace(/^STUDIO_ALLOWED_CIDRS=.*$/m, 'STUDIO_ALLOWED_CIDRS=0.0.0.0/0')],
    ['malformed CIDR', text.replace(/^STUDIO_ALLOWED_CIDRS=.*$/m, 'STUDIO_ALLOWED_CIDRS=203.0.113.10/999')],
    ['mismatched JWT secret', text.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${'a'.repeat(64)}`)],
    ['weak dashboard password', text.replace(/^DASHBOARD_PASSWORD=.*$/m, 'DASHBOARD_PASSWORD=password')],
    ['same API/Studio host', text.replace(/^STUDIO_DOMAIN=.*$/m, 'STUDIO_DOMAIN=api.example.com')],
    ['wildcard redirect', text.replace(/^ADDITIONAL_REDIRECT_URLS=.*$/m, 'ADDITIONAL_REDIRECT_URLS=https://app.example.com/**')],
    ['unsafe database URI password', text.replace(/^POSTGRES_PASSWORD=.*$/m, 'POSTGRES_PASSWORD=unsafe&password')],
  ]) {
    const bad = path.join(temporary, 'invalid.env'); fs.writeFileSync(bad, changed, { mode: 0o600 });
    assert.notEqual(spawnSync(process.execPath, [path.join(root, 'scripts/validate.mjs'), bad], { stdio: 'ignore' }).status, 0, `Accepted ${name}`); count++;
  }
  const second = path.join(temporary, 'second.env');
  run('generate-env.mjs', ['--instance', 'ngwanam-test-b', '--api-domain', 'other-api.example.com', '--studio-domain', 'other-studio.example.com', '--site-url', 'https://other-app.example.com', '--admin-cidrs', '203.0.113.11/32', '--output', second]);
  run('validate.mjs', [second]);
  const a = compose(first), b = compose(second);
  const names = object => Object.values(object).map(v => v.name);
  assert(!names(a.volumes).some(n => names(b.volumes).includes(n)), 'Cross-instance volume collision');
  assert.notEqual(a.networks.backend.name, b.networks.backend.name);
  assert.equal(a.networks.proxy.name, b.networks.proxy.name);
  const labelsA = Object.keys(a.services['api-gw'].labels).filter(k => k.includes('ngwanam-test-a'));
  assert(labelsA.length > 0 && labelsA.every(k => !Object.hasOwn(b.services['api-gw'].labels, k)), 'Cross-instance router collision');
  assert.notEqual(a.services.db.environment.POSTGRES_PASSWORD, b.services.db.environment.POSTGRES_PASSWORD);
  assert.notEqual(a.services.auth.environment.GOTRUE_JWT_SECRET, b.services.auth.environment.GOTRUE_JWT_SECRET); count++;
  const upstream = fs.readFileSync(path.join(root, 'vendor/docker/docker-compose.yml'), 'utf8');
  for (const [name, service] of Object.entries(a.services)) {
    if (!service.build) assert(upstream.includes(`image: ${service.image}`), `${name}: not an image from the pinned release`);
    for (const mount of service.volumes ?? []) assert.equal(mount.type, 'volume', 'Checkout bind mount would be fragile across Dokploy Git deploys');
  }
  for (const [dockerfile, image] of [['db.Dockerfile', 'supabase/postgres:17.6.1.136'], ['gateway.Dockerfile', 'envoyproxy/envoy:v1.39.1']]) {
    const content = fs.readFileSync(path.join(root, 'images', dockerfile), 'utf8');
    assert(content.includes(`FROM ${image}`) && upstream.includes(`image: ${image}`));
    assert(!/^ARG |^ENV /m.test(content), 'Platform image build must not take secrets');
    for (const source of [...content.matchAll(/^COPY --chmod=\d+ (\S+) /gm)].map(m => m[1])) assert(fs.statSync(path.join(root, source)).isFile(), 'Missing COPY asset');
  } count++;
  const cds = fs.readFileSync(path.join(root, 'config/envoy/cds.yaml'), 'utf8');
  const lds = fs.readFileSync(path.join(root, 'config/envoy/lds.template.yaml'), 'utf8');
  const clusters = [...cds.matchAll(/^    name: (\S+)$/gm)].map(m => m[1]);
  assert.deepEqual(clusters.sort(), ['auth', 'rest', 'realtime', 'storage', 'meta', 'studio'].sort());
  for (const cluster of [...lds.matchAll(/^\s+cluster: (\S+)$/gm)].map(m => m[1])) assert(clusters.includes(cluster), `Dangling cluster: ${cluster}`);
  assert(lds.includes('name: functions-disabled') && lds.includes('envoy.filters.http.basic_auth') && lds.includes('${DASHBOARD_BASIC_AUTH}'));
  assert(lds.includes('${ANON_KEY}') && lds.includes('${SERVICE_ROLE_KEY}')); count++;
  console.log(`PASS ${count} offline configuration test groups: valid config, no-overwrite, negative security checks, two-instance isolation, official image/asset coverage and gateway dependency review.`);
  console.log('No containers started, no deployments, no database/storage changes, no secrets printed.');
} finally {
  // Only this test's own newly-created directory, never an operator-provided env.
  fs.rmSync(temporary, { recursive: true, force: true });
}
