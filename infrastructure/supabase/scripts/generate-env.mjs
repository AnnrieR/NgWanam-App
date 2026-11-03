// Generate a fresh installation's env file. Never use this to rotate a live stack.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHmac } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const required = name => { const value = option(name); if (!value || value.startsWith('--')) throw new Error(`Required option: ${name}`); return value; };
const hostname = value => {
  if (!/^(?=.{1,253}$)[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(value)) throw new Error('Use lowercase DNS hostnames, without scheme or path');
  return value;
};
const values = {
  INSTANCE_ID: required('--instance'),
  API_DOMAIN: hostname(required('--api-domain')),
  STUDIO_DOMAIN: hostname(required('--studio-domain')),
  SITE_URL: required('--site-url'),
  STUDIO_ALLOWED_CIDRS: required('--admin-cidrs'),
};
if (!/^[a-z][a-z0-9-]{2,47}$/.test(values.INSTANCE_ID)) throw new Error('Instance ID: 3-48 lowercase letters, digits or hyphens, starting with a letter');
if (values.API_DOMAIN === values.STUDIO_DOMAIN) throw new Error('API and Studio must use different hostnames');
const site = new URL(values.SITE_URL);
if (site.protocol !== 'https:' || site.origin !== values.SITE_URL) throw new Error('Site URL must be an HTTPS origin without trailing slash/path');
if (!/^[0-9a-fA-F:.,/]+$/.test(values.STUDIO_ALLOWED_CIDRS) || /(?:^|,)(?:0\.0\.0\.0\/0|::\/0)(?:,|$)/.test(values.STUDIO_ALLOWED_CIDRS)) throw new Error('Specify restricted admin/VPN IP CIDRs, not allow-all ranges');
const hex = bytes => randomBytes(bytes).toString('hex');
Object.assign(values, {
  ADDITIONAL_REDIRECT_URLS: `${site.origin}/auth/confirm,${site.origin}/update-password`,
  POSTGRES_PASSWORD: hex(32), JWT_SECRET: hex(32),
  DASHBOARD_USERNAME: 'admin', DASHBOARD_PASSWORD: hex(24),
  SECRET_KEY_BASE: hex(48), REALTIME_DB_ENC_KEY: hex(8), PG_META_CRYPTO_KEY: hex(32),
});
const iat = Math.floor(Date.now() / 1000);
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
for (const [name, role] of [['ANON_KEY', 'anon'], ['SERVICE_ROLE_KEY', 'service_role']]) {
  const content = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role, iss: 'supabase', iat, exp: iat + 5 * 365 * 86400 })}`;
  values[name] = `${content}.${createHmac('sha256', values.JWT_SECRET).update(content).digest('base64url')}`;
}
let template = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const [key, value] of Object.entries(values)) {
  if (/[\r\n'"$`]/.test(value)) throw new Error(`Unsafe env characters for ${key}`);
  template = template.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
}
const destination = path.resolve(option('--output') ?? path.join(root, '.env'));
fs.writeFileSync(destination, template, { flag: 'wx', mode: 0o600 });
console.log('Created private env file (no values printed). Keep it outside Git and back it up encrypted.');
console.log('Legacy API JWTs expire in five years; plan coordinated rotation before expiry.');
