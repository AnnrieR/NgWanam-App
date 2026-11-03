// Maintenance tool only. Not run at deployment/startup. Review upstream before updating.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commit = 'bc27d2661edd09a5d0b8d76ce33da6d4071a756e';
const release = 'self-hosted/v0.8.3';
const files = [
  'LICENSE', 'docker/docker-compose.yml',
  ...['roles.sql', 'jwt.sql', 'realtime.sql', '_supabase.sql', 'logs.sql', 'pooler.sql', 'webhooks.sql'].map(f => `docker/volumes/db/${f}`),
  ...['envoy.yaml', 'cds.yaml', 'lds.template.yaml', 'docker-entrypoint.sh'].map(f => `docker/volumes/api/envoy/${f}`),
];
const manifest = { repository: 'https://github.com/supabase/supabase', release, commit, files: {} };
for (const file of files) {
  const response = await fetch(`https://raw.githubusercontent.com/supabase/supabase/${commit}/${file}`);
  if (!response.ok) throw new Error(`Upstream download failed: ${file} (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const destination = path.join(root, 'vendor', file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  manifest.files[`vendor/${file}`] = createHash('sha256').update(bytes).digest('hex');
}

// Preserve official gateway filters/key translation/Basic Auth. Only disable the
// unused Edge Function route and remove its DNS cluster; no runtime fetch/install.
const source = path.join(root, 'vendor/docker/volumes/api/envoy');
const output = path.join(root, 'config/envoy');
fs.mkdirSync(output, { recursive: true });
let cds = fs.readFileSync(path.join(source, 'cds.yaml'), 'utf8');
const clusters = cds.split(/(?=^  - '@type':)/m);
if (clusters.filter(s => /\n    name: functions\n/.test(s)).length !== 1) throw new Error('Unexpected cluster format');
cds = clusters.filter(s => !/\n    name: functions\n/.test(s)).join('');
let lds = fs.readFileSync(path.join(source, 'lds.template.yaml'), 'utf8');
const expression = /^(\s*)- name: functions-v1-all\n[\s\S]*?(?=^\1- name:)/m;
if (!expression.test(lds)) throw new Error('Unexpected functions route format');
lds = lds.replace(expression, (_, spaces) => `${spaces}- name: functions-disabled\n${spaces}  match:\n${spaces}    prefix: /functions/v1/\n${spaces}  direct_response:\n${spaces}    status: 404\n\n`);
for (const [file, text] of [['cds.yaml', cds], ['lds.template.yaml', lds]]) {
  fs.writeFileSync(path.join(output, file), text);
  manifest.files[`config/envoy/${file}`] = createHash('sha256').update(text).digest('hex');
}
fs.writeFileSync(path.join(root, 'UPSTREAM.lock.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Vendored ${files.length} official files from ${release} at ${commit}; recorded SHA-256 checksums.`);
