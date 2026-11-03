# NgWanam: isolated Supabase for Dokploy

**Status: configuration prepared/reviewed; not deployed or load-tested on the VPS.**
Docker Compose validation is not proof of database startup, TLS, backups or application
behavior. Complete the acceptance checklist before taking real orders.

## Layout and upstream provenance

**Dokploy Compose Path:** `infrastructure/supabase/docker-compose.supabase.yml`

This directory is independently deployable; the root `compose.yaml` / Next.js
`ngwanam-web` Application is **not** part of it. Use standard **Docker Compose**, not
Docker Stack/Swarm mode: this file uses config-only image builds and Compose health
dependencies. Use Docker Compose v2.24+ and a current Dokploy release.

Base: current tagged official `self-hosted/v0.8.3` at immutable commit
`bc27d2661edd09a5d0b8d76ce33da6d4071a756e` (latest self-hosted tag checked during
preparation). `UPSTREAM.lock.json` records SHA-256 checksums, `vendor/` contains the
original official Compose, Apache license, seven SQL bootstrap files and all four
Envoy assets. Deployments never fetch configuration from GitHub at runtime.

| Service | Pinned upstream image/base | Memory cap / CPU cap |
|---|---|---|
| db | `supabase/postgres:17.6.1.136` | 3 GiB / 1 |
| auth | `supabase/gotrue:v2.197.0` | 384 MiB / 0.35 |
| rest | `postgrest/postgrest:v14.18` | 256 MiB / 0.35 |
| realtime | `supabase/realtime:v2.143.3` | 768 MiB / 0.5 |
| storage | `supabase/storage-api:v1.81.0` | 512 MiB / 0.35 |
| meta | `supabase/postgres-meta:v0.100.0` | 256 MiB / 0.2 |
| studio | `supabase/studio:2026.10.12-sha-3699278` | 768 MiB / 0.35 |
| api-gw | `envoyproxy/envoy:v1.39.1` | 256 MiB / 0.25 |

`db` and `api-gw` use tiny derived Dockerfiles to COPY the pinned bootstrap/config
into those official bases. This avoids Dokploy Git re-clones invalidating checkout
bind mounts. There are **no secret build args, package installations or app builds**
in these images. The image tags are version-pinned, not digest-pinned; review upstream
security notices and resolve immutable registry digests if your release policy requires
bit-for-bit image reproducibility. No automatic image updater is configured.

### Application compatibility review

- `src/lib/supabase/{client,server,proxy}.ts`: Supabase SSR clients, cookie sessions,
  `getUser`/`getClaims`; email/password login and registration require **Auth**.
- `src/lib/supabase/admin.ts` and admin actions use the server-only service-role key
  for account provisioning/deletion. RLS/role guards remain in application/database code.
- `src/hooks/use-live-inventory.ts`, `use-notifications.ts` and
  `orders/[orderId]/order-status.tsx` subscribe to `postgres_changes`. Inventory and
  notifications have polling fallback, but order status does not. **Retain Realtime**
  to preserve current functionality, rather than silently degrading the app.
- Application migrations publish `orders`, `inventory` and `notifications` to
  `supabase_realtime`. Keep the upstream tenant hostname as a **network-local** alias,
  not a globally fixed container name. Each stack has its own database/tenant.
- Storage API is required for `menu-photos`, `avatars`, private `delivery-proofs`, and
  `gcash-qr`. Migrations create the buckets and RLS policies. Public images use URLs;
  proofs use signed URLs. Actual files live in the Storage volume, not in Git/SQL.
- PostgREST exposes **public only**, with `public,extensions` search path. `private`,
  `auth` and `storage` schemas are not exposed through the Data API. RPCs, grants,
  RLS, inventory reservations and payment verification stay unchanged.
- No use of Edge Functions, SQL pooling, GraphQL, S3 protocol or image transforms was
  found in this app. Gemini runs server-side in Next.js. Omit functions, pooler,
  imgproxy, analytics, Vector, MinIO and extra reverse proxies.

Upstream SQL for internal `_supabase`, `_analytics`, `_supavisor`, webhooks, roles,
JWT settings and Realtime is retained even without the optional runtime services.
Do not delete bootstrap SQL because a schema appears unused. The platform image also
contains its own role/extension/auth/storage initialization; plain PostgreSQL is not a
substitute. Config adaptation disables the Edge Functions route and removes its DNS
cluster only; official gateway auth/key translation/filter logic is preserved.
Studio Logs, Edge Functions, GraphQL and transformation tools are outside this setup.

## Resource and instance isolation

The 4-vCPU / 16-GB / 200-GB VPS is **shared**: these starting caps total about
6.125 GiB and 3.35 CPU maximums for this instance, not a performance guarantee or a
reservation. PostgreSQL has 100 connections, 512-MB shared buffers, 4-MB work memory;
PostgREST's pool is 10. Realtime/Envoy worker counts are bounded. Monitor RSS, OOM
restarts, DB connections/replication slots, CPU and disk before adding more instances.
Do not assume several stacks can all hit their caps while Next.js builds run.
Build one web app at a time; keep substantial OS/Dokploy/build headroom.

- Every service has health checks, restart policy, PID/memory/CPU caps and bounded
  JSON logs (10 MB × 3). Unhealthy status alone does not automatically restart a
  live process; alert and investigate rather than adding a destructive watchdog.
- Named volumes: `pg-data`, `db-config` (encryption material), `storage-data`,
  `studio-snippets`, and an empty Studio functions folder. Compose namespaces all
  volumes and the backend network by the **Dokploy project name**.
- No `container_name`, global volume name, host networking, Docker socket, host-port
  publication or external database is configured. Only the gateway joins the existing
  external Traefik network; every other service stays on the project backend bridge.
- `INSTANCE_ID` uniquely namespaces image/Traefik names. Give each separate Supabase
  instance a unique Dokploy project name **and** instance ID, domains and secrets.
  Sharing the Traefik network is not strict network-level tenant isolation: only
  trusted workloads should join it, and Docker administrators can access containers.
- Keep project names stable. Renaming/recreating the Dokploy service can attach empty
  new volumes; it is not a database migration. Never use volume-prune/reset commands
  to troubleshoot. These settings are single-node, not HA or automatic failover.

## 1. Prepare DNS, routing and secrets (do not deploy yet)

Ubuntu 24.04 with Docker/Dokploy already installed is assumed. Configure DNS for
`api.example.com`, `studio.example.com` and the separate app domain. In the provider
firewall, expose only HTTPS/HTTP for Traefik and restricted admin SSH. Do not open
5432, 6543, 8000, 8080, 9999 or Studio's 3000. Harden Dokploy's own UI with HTTPS/2FA.

Confirm existing Traefik settings: `TRAEFIK_NETWORK`, `TRAEFIK_ENTRYPOINT`, and
`TRAEFIK_CERT_RESOLVER`. Defaults are `dokploy-network`, `websecure`, `letsencrypt`;
do not create a second proxy or change settings used by other applications.

Generate an env file privately from a repository checkout with Node 24 (no npm
dependencies needed). Run once per **fresh installation**, not on an existing stack:

```bash
node infrastructure/supabase/scripts/generate-env.mjs \
  --instance ngwanam-supabase \
  --api-domain api.example.com \
  --studio-domain studio.example.com \
  --site-url https://app.example.com \
  --admin-cidrs YOUR_ADMIN_PUBLIC_IP/32 \
  --output /PRIVATE_EXISTING_DIRECTORY/ngwanam-supabase.env
```

The generator refuses overwrite, uses cryptographically random per-instance secrets,
writes with mode 0600 on Linux, and never prints values. Keep the containing directory
0700. On Windows, secure the file with NTFS permissions instead. `.env.example`
documents **every** variable; it has no usable credentials. Supply only the generated
variables to this stack, not another project's env. Copy the private contents into
Dokploy's Environment editor using your private admin session, not Git/shared logs.

This setup deliberately uses matching legacy **HS256 anon/service-role JWTs** across
Auth, gateway, REST, Storage, Realtime and Studio. Optional opaque/asymmetric settings
are empty. Do not mix key schemes. API JWTs generated here expire in five years;
plan coordinated key rotation before expiry. Never casually rotate JWT/database/
encryption secrets after accounts/data exist; existing sessions/data may be affected.

Email/password signup is enabled, email autoconfirm matches the current application,
phone/anonymous/social login are off. Public registration can still receive fake emails:
monitor abuse and rate limits before launch. Email verification remains a separate
application decision. Password recovery/invitation email requires real SMTP: blank
SMTP intentionally means unavailable email, not a deployed fake mail service.

## 2. Validate without starting services

```bash
node infrastructure/supabase/scripts/validate.mjs /PRIVATE_DIRECTORY/ngwanam-supabase.env
docker compose --env-file /PRIVATE_DIRECTORY/ngwanam-supabase.env \
  -p ngwanam-supabase \
  -f infrastructure/supabase/docker-compose.supabase.yml config --quiet
```

These commands only resolve/review configuration; they do not run containers, pull
images, migrate, seed or contact a database. The validator checks pinned file hashes,
JWT signatures/roles, length requirements, CIDRs, scopes, required services, routing
and operational safeguards. Do not publish full `docker compose config` output—it
contains secrets. Run the negative/offline test suite with:

```bash
node infrastructure/supabase/scripts/test-config.mjs
```

## 3. Dokploy GitHub Compose provider

After review and explicit operator approval:

1. Authorize Dokploy's GitHub integration for private `AnnrieR/NgWanam-App`.
2. Create a **separate Compose service**, e.g. `ngwanam-supabase`, under the project.
   Leave the existing `ngwanam-web` Application untouched.
3. Select GitHub provider → this repository → reviewed branch/commit.
4. Set **Compose Path** exactly to:
   `infrastructure/supabase/docker-compose.supabase.yml` (relative to repo root).
5. Use **Docker Compose**, not Stack. Both image build contexts resolve relative to
   that file's directory (`infrastructure/supabase`), not the web project root.
6. Paste the generated private env into **Environment**. Keep Dokploy's stable
   generated Compose project name; record it for maintenance commands and backups.
7. **Use the included Traefik labels**. Do not add Dokploy auto-generated Domains
   routers that bypass these host/path/IP guards, and do not enable an option that
   attaches *all* services to the shared network. Review rendered network/labels.
8. Verify the external proxy network/entrypoint/certificate resolver already exist.
   Standard Dokploy Docker-provider routing must discover Compose containers.
9. Only then deploy manually. Inspect health privately; do not enable AutoDeploy until
   an explicitly approved redeploy/persistence test passes. No automatic migrations.

### Routing and Studio security

- `https://api.example.com` routes SDK **Auth/REST/Storage/Realtime prefixes only**.
  `/`, `/pg/` and Studio paths on this host have no matching router (normally 404).
- `https://studio.example.com` routes to the **same gateway**, protected by an admin
  IP/VPN allowlist plus official dashboard Basic Auth. No domain points directly to
  `studio`, `meta` or the database. Passwords stay in gateway runtime env, not labels.
- Set `STUDIO_ALLOWED_CIDRS` to specific admin public IPs/VPN egress CIDRs. Behind
  Cloudflare/CDNs, start with DNS-only records: the middleware uses the direct peer
  IP. Do not allow the whole Internet/CDN range to make a blocked dashboard work.
  Only configure forwarded-header/IP strategies after restricting trusted proxies
  in Traefik and testing spoofed `X-Forwarded-For` rejection.
- Customers must not encounter Studio Basic Auth or IP restrictions on API routes.
  Traefik automatically forwards WebSocket upgrades; test Realtime end-to-end.
- HTTP should redirect to HTTPS via the existing Traefik configuration. Test both
  domains; do not serve Studio over plaintext. Basic Auth is not SSO/2FA; the IP/VPN
  boundary is intentional. Compromise of Studio is privileged database access.

## 4. Platform initialization and app migrations

On the first **empty** PostgreSQL volume, the derived image runs the exact official
SQL initialization in its original destination/order. Auth/Storage/Realtime perform
their own platform migrations. These init scripts do not re-run on existing PGDATA.
Do not delete a volume if initialization fails; preserve logs/data and diagnose.

The app's `supabase/migrations/` is a **separate migration history**. Apply it only
after platform services are healthy, using the pinned CLI version from package.json.
On the Ubuntu VPS host, identify this stack's database without publishing SQL:

```bash
# Use the exact project name shown by Dokploy, NOT an assumed service/display name.
export SB_PROJECT=THE_ACTUAL_DOKPLOY_COMPOSE_PROJECT
export SB_ENV=/PRIVATE_DIRECTORY/ngwanam-supabase.env
# Run from the repository root in this example.
dc() { docker compose -p "$SB_PROJECT" --env-file "$SB_ENV" \
  -f infrastructure/supabase/docker-compose.supabase.yml "$@"; }
DB_CONTAINER="$(dc ps -q db)"
test -n "$DB_CONTAINER" || exit 1
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$DB_CONTAINER"
```

The printed backend IP is reachable **from the Linux VPS host**, not from the public
Internet or your Windows laptop. Use it in a private URL
`postgresql://postgres:HEX_PASSWORD@INTERNAL_DB_IP:5432/postgres`. IPs may change;
resolve it again for each maintenance session. Do not use this URL in the web app.

```bash
read -rsp 'Private internal database URL: ' DEPLOY_DB_URL; echo
npx supabase migration list --db-url "$DEPLOY_DB_URL"
npx supabase db push --db-url "$DEPLOY_DB_URL" --dry-run
# Review pending versions and back up existing data BEFORE approving this step:
npx supabase db push --db-url "$DEPLOY_DB_URL"
unset DEPLOY_DB_URL
```

Stop on unexpected migration history. Never use `db reset`, routine repair,
`--include-seed` or seed.sql here. Historical migrations include initial restaurant/
menu defaults with zero stock; review that catalog before launch. They do **not**
provision the known-password local thesis accounts from `supabase/seed.sql`.
Create a new Auth account with a unique password privately, then promote only its
verified exact UUID through privileged SQL to bootstrap the first admin. Apply all
migrations before creating users so the profile trigger exists. Verify enabled RLS,
bucket permissions and public RPC grants; do not "fix" access by disabling RLS.

Local data/files do not move automatically. If preserving them, plan a separate
version-compatible Auth/data/Storage migration and URL rewrite, with rollback backups.
Do not overwrite a new platform's internal schemas with an unreviewed local dump.
Menu/avatar fields store absolute URLs; old localhost URLs must be remapped to the
new HTTPS origin while preserving object paths. Proof/QR paths also require the
actual matching files. Preserve historical transactions and identity sequences.

## 5. Connect the separate Next.js application

In the existing `ngwanam-web` Application, set **both Docker build arguments and
runtime env**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://api.example.com
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<this stack's ANON_KEY>
```

The SDK accepts the legacy anon JWT even though this app calls the variable
"PUBLISHABLE_KEY". It is public by design, but RLS must still protect records.
In **runtime only**, set:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=<this stack's SERVICE_ROLE_KEY>
GEMINI_ENABLED=false
```

Never use the service-role key in public variables, build arguments, Git, screenshots
or browser requests. Build without private keys; inject them only when starting the
web container. Rebuild the Next.js image after changing public values. An existing
image built against the old URL will keep calling it. Gemini is unrelated to this
stack: add its server-only key/enable it only if intended. The root app Compose
already passes public build args and private runtime env separately.

## 6. Acceptance checks (on the deployed staging stack)

- All eight services healthy; confirm no publicly reachable PostgreSQL/internal
  ports from another machine. Check the actual rendered service networks/volume
  names, and that a neighboring Supabase stack remains healthy/unmodified.
- Allowed admin IP: Studio without credentials → 401; valid Basic Auth → dashboard,
  SQL/table editor/Auth/Storage tools work. Outside allowed CIDRs → 403. Do not send
  passwords on command lines; use a private browser/password-manager session.
- API host `/` and `/pg/...` → no Studio response; SDK routes → no dashboard login.
- With the anon key loaded privately into your test shell:
  `curl -fsS -H "apikey: $ANON_KEY" https://api.example.com/auth/v1/health`.
  Verify `/rest/v1/` and the public `/rest/v1/rpc/get_restaurant_info` RPC, then verify guest reads cannot
  access protected profile/order/payment data. Never use service-role for RLS tests.
- Register/sign in a unique test customer, reload/refresh its cookie session,
  sign out, and test inactive users and customer/staff/admin/rider boundaries.
  With real SMTP only, test recovery using the exact `/update-password` redirect.
- As permitted roles, upload/read/remove a test menu photo/avatar/GCash QR and verify
  public links. Verify a proof requires an authorized signed URL; unauthorized users
  cannot read another customer's proof or upload into another user's folder.
- Upload 1,048,575 bytes within an allowed format → accepted; 1,048,576 bytes →
  rejected. Verify signature/MIME validation in the web actions as well as bucket
  RLS/MIME limits. Storage API global cap is also 1,048,575 bytes.
- Verify actual WebSocket `SUBSCRIBED` state and live updates in separate sessions
  for orders/inventory/notifications, not just their polling fallback. Check the three
  publications and WAL/replication-slot growth. Do not remove Realtime silently.
- Test COD/manual GCash, stock reservation/release/one-time deduction and payment
  verification on dedicated staging records. No real money is transferred by tests.
- Redeploy the same project and verify users, transactions and photo bytes persist.
  Test from an actual phone on a separate network. Remove only identified test data.

## 7. Backups and restore rehearsal

Set RPO/RTO and retention before launch (for example daily full backups plus more
frequent backups if daily order loss is unacceptable). Encrypt and copy **off VPS**;
the 200-GB disk and Hostinger snapshots are not an independent backup strategy.
Monitor free space/inodes, backup size/age, errors and restore duration. Do not back
up active PGDATA with tar or rely only on Dokploy raw-volume backups for PostgreSQL.

For a simple consistent **maintenance-window** backup, use the `dc` function above
for this exact deployed project. Schedule downtime, block writes, and keep the
database running while stopping API clients, Auth/Storage and Studio first:

```bash
umask 077
BACKUP=/PRIVATE_BACKUP_DIRECTORY/$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP"
dc stop api-gw studio meta realtime storage rest auth
dc exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U supabase_admin -d postgres -Fc' > "$BACKUP/postgres.dump"
dc exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U supabase_admin -d _supabase -Fc' > "$BACKUP/internal.dump"
dc exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dumpall -h 127.0.0.1 -U supabase_admin --globals-only' > "$BACKUP/globals.sql"
dc run --rm --no-deps --entrypoint tar storage -C /var/lib/storage -czf - . > "$BACKUP/storage.tar.gz"
dc run --rm --no-deps --entrypoint tar db -C /etc/postgresql-custom -czf - . > "$BACKUP/db-config.tar.gz"
# Separately back up Studio snippets if used, and the private env/key material.
# Check EVERY command's exit status; do not mark incomplete/empty archives successful.
dc start auth rest storage realtime meta studio api-gw
```

Use a reviewed backup script with `set -euo pipefail`, error handling and a restart
trap for unattended scheduling; the commands above are an operator checklist, not
an unattended scheduler. Clients must remain quiesced through SQL+file capture.
`globals.sql` contains password hashes; treat it and every archive as secret.
Include the exact Git commit, image versions/digests, encrypted env, migration history,
database encryption-key volume and Storage data. Keep independent retention copies;
never store backups in the repository or public Storage buckets.

**Restore only into an isolated rehearsal project first:**

1. Verify archive checksums/decryption. Create a new Compose project/instance ID,
   private staging domains and separate volumes. Do not point production DNS or
   web apps at it. Use the same pinned platform versions and encryption secrets.
2. Review roles/globals against the freshly bootstrapped platform. Do not blindly
   replay `CREATE ROLE`/password statements over an existing production platform.
   Reconcile owners and passwords so they match the restored private env.
3. Stop all rehearsal clients/services except db. Inspect archives with
   `pg_restore --list`; restore SQL as the privileged platform owner using
   `pg_restore --clean --if-exists --exit-on-error` against the **rehearsal database**,
   retaining object ownership/grants/RLS (do not use `--no-owner`/`--no-acl` to hide
   problems). Resolve version-specific extension/role conflicts; any error means the
   rehearsal failed. No provided command targets production automatically.
4. Restore Storage bytes and encryption material to that rehearsal's own volumes
   with the correct ownership. Do not transplant a live PGDATA directory. For a
   whole-cluster disaster restore, follow the pinned platform's recovery procedure;
   loading SQL over a different major version is not an upgrade strategy.
5. Start rehearsal services, review logs, and repeat acceptance checks: Auth login,
   profile roles, RLS, historical orders/payment totals, stock reservations, sequence
   continuity, object counts/sample image hashes, signed proofs and Realtime.
6. Record restore duration/data-loss window and require sign-off before any planned
   production cutover. Keep the original volumes intact for rollback. Test restores
   periodically, not only when disaster occurs.

## Upgrade and review checklist

- [ ] Reviewed this repo's app/migration/storage compatibility findings.
- [ ] Unique project/instance/domains/secrets; correct shared Traefik identifiers.
- [ ] Private env backed up; admin CIDRs fixed; SMTP limitations accepted/configured.
- [ ] `validate.mjs` and `docker compose config --quiet` pass privately.
- [ ] Rendered API path guards, Studio IP+Basic Auth and no public internal ports.
- [ ] Config-only image builds reviewed; pinned image vulnerability scan/release notes
      reviewed before launch (no claim that these images are vulnerability-free).
- [ ] VPS resource headroom reviewed alongside other apps/instances.
- [ ] Operator explicitly approves first deployment; no automated deployment performed.
- [ ] Platform startup, migration dry-run and backups reviewed before schema changes.
- [ ] Acceptance/persistence/actual-phone checks and isolated restore drill pass.

For upgrades, review upstream diffs before changing pins or running
`scripts/vendor-upstream.mjs` (maintenance-only; it replaces the pinned snapshots and
derived gateway files). Re-run validation and stage the upgrade. Never auto-change
PostgreSQL major versions, regenerate live secrets, reset/reseed, remove volumes,
or rewrite historical records to fix an infrastructure issue.

References: [Supabase self-hosting](https://supabase.com/docs/guides/self-hosting/docker),
[pinned upstream](https://github.com/supabase/supabase/tree/bc27d2661edd09a5d0b8d76ce33da6d4071a756e/docker),
[Dokploy Compose](https://docs.dokploy.com/docs/core/docker-compose),
[Dokploy domains](https://docs.dokploy.com/docs/core/docker-compose/domains),
[Traefik IP allowlist](https://doc.traefik.io/traefik/middlewares/http/ipallowlist/).
