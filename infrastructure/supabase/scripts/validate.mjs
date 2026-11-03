// Offline configuration review only: no pull, up, migrations, or database access.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.resolve(process.argv[2] ?? path.join(root, '.env'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const env = {};
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
assert(/^[a-z][a-z0-9-]{2,47}$/.test(env.INSTANCE_ID), 'Invalid instance ID');
for (const key of ['API_DOMAIN', 'STUDIO_DOMAIN']) assert(/^(?=.{1,253}$)[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(env[key] ?? ''), `Invalid ${key}`);
assert(env.API_DOMAIN !== env.STUDIO_DOMAIN, 'Separate API and Studio domains are required');
assert(new URL(env.SITE_URL).protocol === 'https:' && new URL(env.SITE_URL).origin === env.SITE_URL, 'SITE_URL must be an HTTPS origin');
for (const url of (env.ADDITIONAL_REDIRECT_URLS ?? '').split(',')) assert(url.startsWith(`${env.SITE_URL}/`) && !/[\s*]/.test(url), 'Redirects must be exact application HTTPS URLs');
for (const [key, length] of [['POSTGRES_PASSWORD', 64], ['JWT_SECRET', 64], ['SECRET_KEY_BASE', 96], ['REALTIME_DB_ENC_KEY', 16], ['PG_META_CRYPTO_KEY', 64]]) {
  assert(new RegExp(`^[a-f0-9]{${length}}$`).test(env[key] ?? ''), `Generate a fresh ${key} with the documented length`);
}
assert(/^[a-zA-Z0-9_-]{3,40}$/.test(env.DASHBOARD_USERNAME ?? ''), 'Unsafe dashboard username');
assert(/^[a-zA-Z0-9_-]{32,128}$/.test(env.DASHBOARD_PASSWORD ?? ''), 'Use a strong generated dashboard password');
assert(new Set(['POSTGRES_PASSWORD', 'JWT_SECRET', 'SECRET_KEY_BASE', 'PG_META_CRYPTO_KEY'].map(k => env[k])).size === 4, 'Secrets must not be reused within the stack');
for (const [name, role] of [['ANON_KEY', 'anon'], ['SERVICE_ROLE_KEY', 'service_role']]) {
  const parts = (env[name] ?? '').split('.');
  assert(parts.length === 3, `Invalid ${name}`);
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url'));
  } catch { throw new Error(`${name} has invalid JWT encoding`); }
  const signature = Buffer.from(parts[2], 'base64url');
  const expected = createHmac('sha256', env.JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest();
  assert(header.alg === 'HS256' && payload.role === role && payload.exp > Date.now() / 1000 + 86400, `${name} role/algorithm/expiry mismatch`);
  assert(signature.length === expected.length && timingSafeEqual(signature, expected), `${name} does not match JWT_SECRET`);
}
assert(env.STUDIO_ALLOWED_CIDRS, 'Admin IP allowlist is required');
for (const item of env.STUDIO_ALLOWED_CIDRS.split(',')) {
  const [address, prefix, extra] = item.split('/');
  const family = net.isIP(address);
  const bits = prefix === undefined ? (family === 4 ? 32 : 128) : Number(prefix);
  assert(!extra && family && Number.isInteger(bits) && bits > 0 && bits <= (family === 4 ? 32 : 128), 'Invalid or allow-all Studio IP CIDR');
}
if (env.SMTP_HOST) for (const key of ['SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_ADMIN_EMAIL']) assert(env[key], `SMTP configuration needs ${key}`);

const lock = JSON.parse(fs.readFileSync(path.join(root, 'UPSTREAM.lock.json'), 'utf8'));
for (const [name, hash] of Object.entries(lock.files)) {
  assert(createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex') === hash, `Upstream/derived file checksum changed: ${name}`);
}
// Compose interpolation also sees exported shell vars. Reject surprises by checking
// the resolved values below, and never print resolved config or child error output.
let config;
try {
  config = JSON.parse(execFileSync('docker', ['compose', '--project-name', env.INSTANCE_ID, '--env-file', file, '-f', path.join(root, 'docker-compose.supabase.yml'), 'config', '--format', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} catch { throw new Error('docker compose config failed; review the private env and Compose file locally (do not publish resolved config)'); }
const required = ['db', 'auth', 'rest', 'realtime', 'storage', 'meta', 'studio', 'api-gw'];
assert(Object.keys(config.services).length === required.length && required.every(k => config.services[k]), 'Unexpected service list');
for (const [name, service] of Object.entries(config.services)) {
  assert(!service.container_name && !service.ports?.length, `${name}: no fixed name or published ports allowed`);
  if (service.build) assert(['db', 'api-gw'].includes(name) && service.build.context === root && fs.existsSync(path.join(root, service.build.dockerfile)), `${name}: unexpected build (only platform config images are allowed)`);
  assert(service.image && !/:latest$/.test(service.image), `${name}: image must be pinned`);
  assert(service.healthcheck && service.restart === 'unless-stopped' && service.mem_limit && service.cpus && service.pids_limit, `${name}: operational safeguards missing`);
  assert(service.logging?.options?.['max-size'] && service.logging?.options?.['max-file'], `${name}: log rotation missing`);
  for (const dependency of Object.keys(service.depends_on ?? {})) assert(config.services[dependency], `Missing dependency: ${dependency}`);
  assert(name === 'api-gw' || !service.networks.proxy, `${name}: internal service attached to shared proxy network`);
  for (const mount of service.volumes ?? []) if (mount.type === 'bind') assert(mount.read_only && fs.statSync(mount.source).isFile(), `${name}: invalid/read-write config mount`);
}
assert(config.services.auth.environment.GOTRUE_JWT_SECRET === env.JWT_SECRET, 'Shell env overrides the selected env file');
assert(config.services.db.environment.POSTGRES_PASSWORD === env.POSTGRES_PASSWORD, 'Shell env overrides the database password');
assert(config.services.storage.environment.ANON_KEY === env.ANON_KEY && config.services.storage.environment.SERVICE_KEY === env.SERVICE_ROLE_KEY, 'API key interpolation mismatch');
assert(config.services.storage.environment.ENABLE_IMAGE_TRANSFORMATION === 'false', 'imgproxy dependency is not disabled');
assert(config.services.storage.environment.S3_PROTOCOL_ENABLED === 'false', 'Unused S3 protocol must be disabled');
assert(Number(config.services.storage.environment.FILE_SIZE_LIMIT) === 1048575, 'Strict upload limit changed');
assert(Object.values(config.volumes).every(v => !v.external && v.name?.startsWith(`${env.INSTANCE_ID}_`)), 'Volumes must be project-scoped');
const labels = config.services['api-gw'].labels;
assert(!Object.keys(labels).some(k => k.includes('${')), 'Unexpanded Traefik label key');
assert(labels[`traefik.http.routers.${env.INSTANCE_ID}-studio.middlewares`] === `${env.INSTANCE_ID}-studio-ip`, 'Studio IP middleware missing');
assert(labels[`traefik.http.middlewares.${env.INSTANCE_ID}-studio-ip.ipallowlist.sourcerange`] === env.STUDIO_ALLOWED_CIDRS, 'Studio CIDR interpolation mismatch');
assert(labels[`traefik.http.routers.${env.INSTANCE_ID}-api.rule`]?.includes('PathPrefix'), 'Public API must not expose Studio');
console.log('PASS Compose config, eight required services, pinned assets, JWT consistency, private networking, scoped volumes, resource limits, health checks, log rotation and Studio routing guards.');
console.log('Configuration-only verification. No services deployed and no existing databases contacted.');
