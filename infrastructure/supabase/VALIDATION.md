# Preparation validation — 2026-11-04

## Passed (local, configuration-only)

- Inspected Supabase browser/server/proxy/admin initialization, authentication,
  migrations, Storage actions, live hooks, root Docker/Compose and README.
- Resolved official `self-hosted/v0.8.3` to immutable commit
  `bc27d2661edd09a5d0b8d76ce33da6d4071a756e` and recorded asset SHA-256 hashes.
- `docker compose config` via `scripts/validate.mjs` passed with a newly generated
  synthetic env file outside the repository; no credentials were printed.
- `node infrastructure/supabase/scripts/test-config.mjs`: **12 groups passed**,
  including generator overwrite rejection, invalid-secret/JWT/CIDR/redirect cases,
  and two independently resolved instance configurations without volume/network/
  router-name collisions (only the intended external proxy network is shared).
- Strict YAML parsing passed for Compose and the three runtime gateway YAML files.
- Checked service dependencies/health settings, official image versions/base pins,
  COPY source-file coverage, and removal of the unused functions DNS cluster.
- All services have resource/PID caps, bounded logs and restart/health policies.
- No fixed container names, published host ports, shared data volumes, Docker socket,
  or web application service; only the gateway joins the Traefik network.
- Config-only image builds have no secret args; private env excluded from their
  allowlisted build contexts. Root web-image context excludes infrastructure entirely.
- `git diff --check` passed. No application code or migration history was changed.

## Not performed / required before production approval

- No Docker image build/pull or service startup for this stack.
- No deployment, migration, seed, reset, database connection or Storage modification.
- No image CVE scan or assertion of vulnerability-free dependencies.
- No actual Dokploy/Traefik TLS, proxy-IP allowlist or Basic Auth verification.
- No PostgreSQL bootstrap, Auth/Storage/Realtime startup or full migration replay.
- No authenticated/RLS/upload/transaction end-to-end tests on the new platform.
- No shared-VPS load/capacity test, actual-phone check or backup/restore rehearsal.

The stack is prepared for operator review and staging acceptance, not certified as
an already running production service. Follow the README deployment checklist.
