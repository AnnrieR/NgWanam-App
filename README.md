# Ng Wanam Food House — Online Ordering System

Online ordering, delivery, inventory, and staff operations system for Ng Wanam Food House.
Built with **Next.js**, **Supabase**, and **Tailwind CSS**.

---

## What You Need to Install (One Time Only)

Install these in order. Restart your laptop after installing if asked.

### Windows — open **PowerShell**, then copy-paste:

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Docker.DockerDesktop
```

After it finishes: **close PowerShell, open it again**, then run the checks below.
(If `winget` is not recognized, install **App Installer** from the Microsoft Store first.)

### Mac — open **Terminal**, then copy-paste:

```bash
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git node
brew install --cask docker
```

Notes for Mac:
- The Homebrew line will ask for your laptop password (typing is invisible — just press Enter).
- If it says `command not found: brew`, copy the “Next steps” lines printed at the end of the
  install, paste them, and press Enter — or simply restart Terminal.

### Check if everything installed — copy-paste (same on Windows and Mac):

```bash
git --version
node -v
npm -v
docker --version
```

Every command should print a version. If a command is not found, restart your laptop and try again.

**Prefer clicking instead of terminal?** Download manually:
[Git](https://git-scm.com/downloads) · [Node.js LTS](https://nodejs.org) · [Docker Desktop](https://www.docker.com/products/docker-desktop/) — click Next → Next → Finish.

---

## Setup (First Time on a New Laptop)

> **Note:** The GitHub repo is **private**. Ask your group leader to invite your GitHub
> account as a collaborator first, otherwise `git clone` will ask for a password.

### 1. Open Docker Desktop

Launch **Docker Desktop** and wait until it says it is running (whale icon in the menu bar /
system tray). The next steps will fail if Docker is not running.

### 2. Get the code

```bash
git clone https://github.com/AnnrieR/NgWanam-App.git
cd NgWanam-App
```

### 3. Install the project packages

```bash
npm install
```

### 4. Create your environment file

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
copy .env.example .env.local
```

Check the local URL and publishable key against `npx supabase status` after starting Supabase. For Admin → User Management account creation, set `SUPABASE_SERVICE_ROLE_KEY` in the ignored `.env.local` to the local service-role key shown by that command. Never prefix that privileged key with `NEXT_PUBLIC_`, share it, or commit it. Restart the app after changing environment variables.

### 5. Start the local database (Supabase)

```bash
npx supabase start
```

- First run downloads Docker images and can take **5–10 minutes**.
- When finished it prints the local URLs (see the table below).

### 6. Create the tables and sample menu

```bash
npx supabase db reset
```

**First setup only:** this deletes local data. Do not reset the existing database just to run tests. This applies all migrations, including the sample menu data and local thesis accounts. Every seeded account uses the password `NgWanam123!`:

| Email | Role |
| --- | --- |
| `admin@ngwanam.local` | Admin |
| `kitchen1@ngwanam.local` | Kitchen staff |
| `kitchen2@ngwanam.local` | Kitchen staff |
| `rider@ngwanam.local` | Delivery rider |
| `customer@ngwanam.local` | Customer |

### 7. Run the app

```bash
npm run dev
```

Open **http://localhost:3000** — you should see the Ng Wanam landing page.

---

## Create Another Admin Account

The local seed already creates an admin account. To create another admin account:

1. Sign in as `admin@ngwanam.local` with `NgWanam123!`.
2. Open **User Management → Create account**.
3. Enter the name, unique email, role, password, and matching confirmation.
4. Save, then sign in using the new account in a separate browser profile.

Admin, staff, and delivery accounts are created locally with manually assigned passwords. No confirmation email or OTP is required. The server-only local service-role key must be configured as described above.

---

## The Four Roles

| Role | Dashboard | What they do |
|------|-----------|--------------|
| `customer` | `/home` | Browse menu, order, track delivery |
| `staff` | `/staff` | Inventory, orders, payments, edit menu |
| `delivery` | `/delivery/orders` | Pick up and deliver assigned orders |
| `admin` | `/admin` | Accounts, reports, restaurant settings |

Everyone registers as a **customer**. Only an admin can change roles.

## Full Local Testing Guide

See [docs/LOCAL_TESTING.md](docs/LOCAL_TESTING.md) for the step-by-step Customer → Staff → Rider → Admin test checklist, expected inventory changes, payment checks, negative tests, and latest verification scope.

---

## How to Run It (Every Day After Setup)

Docker Desktop must be open first, then:

```bash
cd NgWanam-App
npx supabase start    # start the database (skip if already running)
npm run dev           # start the app
```

Stop the app with `Ctrl + C` (Windows/Linux) or `Cmd + C` (Mac).

## Pull Updates After the Pull Request Is Merged into Main

Open Docker Desktop. Stop the running app with `Ctrl + C`, then open a terminal
**inside your existing `NgWanam-App` folder** containing both `package.json` and
`supabase/config.toml` (not a parent directory or an older duplicate copy).
Run each command separately; stop if
any command fails:

```bash
git status
git switch main
git pull --ff-only origin main
npm ci
npx supabase start
npx supabase migration up --local
npx supabase migration list --local
npm run dev
```

- If `git status` shows your own edits, preserve/commit them before switching or
  pulling. Do not use `git reset --hard` to force an update.
- `git pull` updates code and SQL files only. `migration up --local` applies
  pending SQL migrations to your own local database, without reseeding it.
- **Do not run `supabase db reset` for normal updates:** it deletes your local
  accounts, orders and database history. Do not rerun `supabase/seed.sql` either.
- Keep your existing `.env.local`; Git does not share it. For admin account
  creation/deletion, set the server-only `SUPABASE_SERVICE_ROLE_KEY` using your
  own local `npx supabase status` output. Never commit or share the key.
- If a migration fails, stop and share the error (without secrets). Do not mark
  it applied manually or use migration repair/reset as a shortcut.

Full student instructions, troubleshooting and migration review results:
[docs/STUDENT_UPDATES.md](docs/STUDENT_UPDATES.md).

Other useful commands:

```bash
npx supabase status    # show URLs, keys, and what is running
npx supabase stop      # stop the database containers
npx supabase db reset  # wipe local data and reload migrations + sample menu
```

---

## Local URLs

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:55323 |
| Supabase API | http://127.0.0.1:55321 |

---

## Deploy the Frontend Shell to Vercel (No Supabase Yet)

You can publish the landing page before setting up a cloud Supabase project.

1. Go to https://vercel.com and sign in with GitHub.
2. Click **Add New** → **Project**.
3. Import `AnnrieR/NgWanam-App` from GitHub.
4. Leave the framework as **Next.js**.
5. Do **not** add Supabase environment variables yet.
6. Click **Deploy**.

The landing page, story, reviews, coupons, header, and footer will work as a frontend demo.
The gallery and featured-menu sections need catalog data, so they stay hidden. The menu page shows
“Menu unavailable”, and login, registration, ordering, and chatbot replies remain unavailable until
Supabase is connected.

Later, create a cloud Supabase project, add these values in **Vercel → Project Settings → Environment Variables**,
then redeploy:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

---

## VPS installation: KVM 4 + Dokploy + lean Supabase + Studio

**For shared-VPS production deployments, use the maintained
[isolated Supabase stack](infrastructure/supabase/README.md).**

- Dokploy GitHub Compose Path: `infrastructure/supabase/docker-compose.supabase.yml`
- Includes pinned official bootstrap/config assets, isolated persistent volumes,
  private networking, HTTPS routing, protected Studio and offline validation tools.
- The Next.js web application stays separate; root `compose.yaml` is app-only.
- No stack has been deployed automatically. Complete the deployment/restore checklist.

<details>
<summary>Archived manual single-stack guide — superseded; do not use for shared Dokploy deployments</summary>

This is a **self-hosted alternative** to Supabase Cloud. Commands below target a
fresh Ubuntu 24.04 VPS; replace example domains with your own. KVM 4 plan resources
vary by provider: check the actual CPU/RAM/disk allocation, monitor usage, and build
only one application at a time. This is a deployment runbook, **not a claim that
this project has already been tested on your VPS or on an actual phone**.

### 1. Prepare the VPS and domains

Create DNS A records pointing to the VPS IP:

| Host | Purpose |
|------|---------|
| `deploy.example.com` | Dokploy administration |
| `app.example.com` | Ng Wanam Next.js app |
| `api.example.com` | Supabase API gateway; protected Studio at `/` |

Use SSH keys, install OS security updates, and take a VPS snapshot first. In the
provider firewall, allow SSH only from your admin IP, public TCP 80/443, and
temporarily TCP 3000 **only from your admin IP** for Dokploy setup. Keep PostgreSQL,
Storage, Auth, Realtime and Studio internal ports closed to the Internet. Do not
publicly open Docker Swarm ports for a single-node installation. Docker-published
ports can bypass ordinary UFW rules, so also use the provider firewall.

```bash
ssh root@YOUR_VPS_IP
apt-get update
apt-get install -y ca-certificates curl git openssl nano python3-yaml
curl -sSL https://dokploy.com/install.sh -o /root/install-dokploy.sh
less /root/install-dokploy.sh
sh /root/install-dokploy.sh
```

Review the installer before running it; it installs/configures Docker and Dokploy.
Ports 80/443/3000 must not already belong to another web stack. Immediately create
your administrator at `http://YOUR_VPS_IP:3000`, configure the Dokploy HTTPS domain
and 2FA, then remove public port-3000 access. Use the stable installer, not canary.

### 2. Choose the lean Supabase services

| Keep | Why this app needs it |
|------|-----------------------|
| `db` | PostgreSQL, RLS, RPCs, orders, inventory and payment data |
| `api-gw` | Public API routing and Studio Basic Auth (Envoy in the pinned release) |
| `auth` | Local email/password accounts and sessions |
| `rest` | Supabase queries and database RPCs through PostgREST |
| `realtime` | Order/inventory/notification subscriptions |
| `storage` | Menu photos, avatars, delivery proofs and GCash QR uploads |
| `meta` | Studio database administration |
| `studio` | Supabase dashboard |

Omit **Edge Functions, Supavisor/pooler, imgproxy, Analytics/Logflare, Vector,
S3/MinIO, mail testing containers and separate reverse proxies**. The app uses
Supabase HTTP APIs, not direct application SQL connections; Gemini executes in
Next.js server code, not an Edge Function. Images use ordinary Storage URLs, not
Storage transformation endpoints. Dokploy already provides Traefik/TLS.

Studio Logs/Edge Function tools, image transformations, pooler and unused gateway
routes will consequently be unavailable. This is intentional. Keep the Supabase
database initialization SQL even for omitted services; do not strip internal schemas.

### 3. Obtain the official stack and create private secrets

Use a versioned upstream checkout, not a hand-written replacement for Supabase's
initialization scripts. This guide targets **`self-hosted/v0.8.3`**; service names
and configuration differ in older Kong-based templates. Do not mix releases.

```bash
install -d -m 700 /opt/ngwanam-supabase
git clone --depth 1 --branch self-hosted/v0.8.3 \
  https://github.com/supabase/supabase.git /opt/ngwanam-supabase/upstream
cd /opt/ngwanam-supabase/upstream/docker
cp .env.example .env
chmod 600 .env
sh utils/generate-keys.sh --update-env
nano .env
```

The key generator prints credentials: run it only in your private SSH terminal,
not in shared build logs. Review **all** defaults in `.env` afterwards, especially:

- Unique `POSTGRES_PASSWORD`, `JWT_SECRET`, matching generated `ANON_KEY` and
  `SERVICE_ROLE_KEY`; never keep upstream demo keys. Prefer hex passwords to avoid
  URL-encoding problems. Do not regenerate these after data/accounts are in use.
- Strong unique `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` for Studio.
- Unique `SECRET_KEY_BASE`, `REALTIME_DB_ENC_KEY` (exactly 16 characters),
  `PG_META_CRYPTO_KEY`, and any remaining encryption/storage secrets. Follow the
  lengths and generation instructions in the release's `.env.example`.
- Leave `OPENAI_API_KEY` empty; Studio AI is not needed for this app.
- This runbook uses the generated **legacy HS256 API keys** consistently. Leave
  optional asymmetric/opaque-key fields empty unless you configure that complete
  documented flow across the gateway and every verifier.

Set the following **inside that private `.env`**, not in Git:

```dotenv
COMPOSE_FILE=docker-compose.lean.yml
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=postgres
SUPABASE_PUBLIC_URL=https://api.example.com
API_EXTERNAL_URL=https://api.example.com/auth/v1
SITE_URL=https://app.example.com
ADDITIONAL_REDIRECT_URLS=https://app.example.com/auth/confirm
DISABLE_SIGNUP=false
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_ANONYMOUS_USERS=false
ENABLE_PHONE_SIGNUP=false
PGRST_DB_SCHEMAS=public
```

Email autoconfirm preserves this project's current non-verified local-auth flow;
it is not production email verification. Do not enable Google, phone/SMS or mail
features unintentionally. Password-reset emails need a real SMTP configuration;
upstream fake SMTP values do not send mail. Update the redirect allowlist to exact
routes if email flows are configured later; avoid wildcard redirects.

### 4. Generate the lean Compose file (fresh stack only)

Run in `/opt/ngwanam-supabase/upstream/docker`. This keeps the eight services above,
removes Storage's imgproxy dependency, makes bind mounts independent of Dokploy's
working directory, and exposes SQL **only on loopback** for migrations/backups.
It does not start containers or delete volumes.

```bash
python3 - <<'PY'
from pathlib import Path
import yaml

root = Path.cwd()
assert root == Path('/opt/ngwanam-supabase/upstream/docker')
cfg = yaml.safe_load((root / 'docker-compose.yml').read_text())
keep = {'db', 'api-gw', 'auth', 'rest', 'realtime', 'storage', 'meta', 'studio'}
assert keep <= cfg['services'].keys(), 'Unexpected upstream release'
cfg['services'] = {k: v for k, v in cfg['services'].items() if k in keep}
for name, svc in cfg['services'].items():
    deps = svc.get('depends_on', {})
    svc['depends_on'] = {k: v for k, v in deps.items() if k in keep}
    if not svc['depends_on']:
        del svc['depends_on']
    svc.pop('ports', None)
    for i, mount in enumerate(svc.get('volumes', [])):
        if isinstance(mount, str) and mount.startswith('./'):
            svc['volumes'][i] = str(root / mount[2:])
storage_env = cfg['services']['storage']['environment']
storage_env['ENABLE_IMAGE_TRANSFORMATION'] = 'false'
storage_env.pop('IMGPROXY_URL', None)
cfg['services']['db']['ports'] = ['127.0.0.1:55432:5432']
cfg['volumes'].pop('deno-cache', None)
(root / 'docker-compose.lean.yml').write_text(yaml.safe_dump(cfg, sort_keys=False))
PY
docker compose --env-file .env -f docker-compose.lean.yml config --quiet
docker compose --env-file .env -f docker-compose.lean.yml config --services
```

Expect exactly the eight retained services. Do not print the fully interpolated
Compose configuration into public logs because it contains secrets. These settings
assume a single Supabase stack; upstream fixed container names would collide with
a second installation on the same VPS.

### 5. Deploy Supabase in Dokploy

1. Create a project → **Compose service** → Raw Compose (UI wording may vary).
2. Paste the generated `docker-compose.lean.yml` into its Compose editor.
3. Copy the private Supabase `.env` values into that service's **Environment**
   settings. Do not commit the populated env or generated secret-bearing files.
4. Set a stable Compose project/service name and keep it for subsequent deployments
   so the `db-config` encryption-key volume is retained.
5. Add HTTPS domain `api.example.com` → service **`api-gw`**, container port **8000**,
   path `/`. Enable WebSocket forwarding for Realtime. Let Dokploy connect this
   service to its Traefik network; don't manually replace the internal network.
6. Deploy, then inspect health/logs privately. Keep all `/opt/.../volumes` paths
   outside Git checkout cleanup. Do not run a second manual Compose deployment
   against the same stack while Dokploy owns it.

**Studio:** open `https://api.example.com/` and sign in using the dashboard Basic
Auth credentials. Never route a public domain directly to `studio:3000` or
`meta:8080`: that bypasses gateway protection. The public API and Studio share this
gateway, so don't apply a blanket IP restriction/extra login to the entire domain
or customer API calls will fail. For stronger isolation, configure route-specific
VPN/IP protection on Studio/dashboard paths without blocking the API routes.

From an untrusted/private-browser session, confirm the dashboard requires login,
while `/auth/v1/health` responds without dashboard Basic Auth. Anonymous database
requests still need an API key and are subject to RLS. Confirm ports 5432, 55432,
6543, 3000 and all individual Supabase service ports are not publicly reachable.

### 6. Apply this app's migrations without resetting anything

The upstream stack creates Supabase's platform schemas, **not this app's tables**.
Clone this repository into a separate private VPS directory using a read-only
deploy key/GitHub integration; never embed GitHub tokens in clone URLs. Install a
supported Node.js version and the Supabase CLI according to their official docs.

From the application checkout, provide a URL such as
`postgresql://postgres:URL_ENCODED_PASSWORD@127.0.0.1:55432/postgres` privately:

```bash
read -rsp 'Private VPS database URL: ' DEPLOY_DB_URL; echo
export DEPLOY_DB_URL
npx supabase db push --db-url "$DEPLOY_DB_URL" --dry-run
# Review the migration list before the real command:
npx supabase db push --db-url "$DEPLOY_DB_URL"
unset DEPLOY_DB_URL
```

Run this on the VPS where the loopback SQL port exists, not inside an unrelated
container. Back up first on an existing database; stop if migration history differs.
**Never use `db reset`, reseed, migration repair, or `--include-seed` as a routine
deployment/update step.** Do not import the local seed into a public environment:
it includes known-password thesis accounts and sample data. Provision an initial
Auth admin with a unique password privately, then set that exact user's profile
role to `admin` using privileged SQL; do not promote by unverified email alone.

Schema migrations do not transfer local transactions, Auth users or uploaded files.
If those must move, plan a separate backed-up Auth/database/Storage migration; do
not restore local platform schemas wholesale over a newer self-hosted platform.
Configure the real GCash destination in **Admin → Admin Settings** after setup.

### 7. Connect the Next.js app in Dokploy

Create an Application using `AnnrieR/NgWanam-App` (authorize the GitHub integration
for this private repo). Choose the **Dockerfile** build type, repository-root build
context `.`, Dockerfile path `Dockerfile`, and container port **3000**. Add HTTPS
domain `app.example.com`.

The included multi-stage Dockerfile uses Node 24, `npm ci --include=dev`, a Turbopack
production build, and Next.js standalone output. The final image runs as the
non-root `node` user with `node server.js`; do not override it with `npm run start`.
It includes `public` and `.next/static` and an HTTP health check. `.dockerignore`
excludes actual env files, Git metadata, local builds, database assets and backups.

In Dokploy's **Build Arguments**, set these two public values (runtime environment
settings alone do not automatically supply Docker `ARG` values):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://api.example.com
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<generated ANON_KEY from the VPS stack>
```

Set these in the **app's runtime** environment settings as well:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://api.example.com
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<generated ANON_KEY from the VPS stack>
SUPABASE_SERVICE_ROLE_KEY=<generated SERVICE_ROLE_KEY from the same stack>
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_ENABLED=false
```

The app's publishable-key variable also accepts the legacy anon JWT used here;
never put a service-role JWT there. `NEXT_PUBLIC_*` values are baked into browser
assets, so rebuild after changing them. Keep `SUPABASE_SERVICE_ROLE_KEY` and optional
`GEMINI_API_KEY` server-only. Enable Gemini only after privately adding a valid key;
FAQ/database fallback remains available without it. Do not copy local Supabase
URLs/keys. Use the externally reachable HTTPS API URL, not a Docker service hostname.

For a manual Docker build/run instead of Dokploy (public placeholders below must
be replaced; never use a service-role key as a build argument):

```bash
docker build -t ngwanam-app:local \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_ANON_KEY .
docker run -d --name ngwanam-app --restart unless-stopped \
  --env-file /opt/ngwanam-secrets/app.env \
  -p 127.0.0.1:3100:3000 ngwanam-app:local
```

Create `/opt/ngwanam-secrets/app.env` privately with the runtime values above and
restrict it to the administrator (`chmod 600`). Do not commit it or copy it into
the image. The manual example binds only loopback; use an HTTPS reverse proxy for
public access. Dokploy handles routing itself, so it does not need this manual
host-port mapping. Container image creation does not migrate or seed the database.

#### Using the included `compose.yaml`

The root `compose.yaml` runs **the Next.js app only**. Deploy Supabase + Studio
separately using the guide above. This app Compose does not create/reset a database
or transfer local uploaded images.

Store the runtime values shown above in a private file outside Git, then run from
the repository root:

```bash
docker compose --env-file /opt/ngwanam-secrets/app.env config --quiet
docker compose --env-file /opt/ngwanam-secrets/app.env up -d --build
docker compose --env-file /opt/ngwanam-secrets/app.env ps
```

Manual access is loopback-only at `127.0.0.1:3100` (`APP_PORT` overrides the port).
Use an HTTPS reverse proxy for public access. Avoid printing resolved Compose
configuration into shared logs because it contains private runtime keys.

For Dokploy, create a **Compose service from this Git repository**, select
`compose.yaml`, supply the Environment values, and route the HTTPS domain to
service **`app`**, container port **3000**. Keep the build context at the repository
root. Deploy either this Compose app or the separate Application described above,
not both for the same website. The two public variables are passed as build args;
private service-role/Gemini keys are runtime-only. Rebuild when public variables
change. The Dockerfile supplies the health check.

### 8. Verify, back up and maintain

- Test registration/login and customer/staff/admin/rider route restrictions.
- Test COD and manual GCash, payment verification, approved delivery fees, stock
  reservation/cancellation/delivery consumption, and read-only support chat.
- Test actual Realtime updates between separate sessions and reconnects over HTTPS.
- Test menu/avatar/proof/QR upload and reject files **at or above 1 MB**. Keep the
  app's strict signature/size guards and per-bucket limits from the migrations.
- Check photos persist after redeployment. Test desktop/mobile layouts **and an
  actual phone**; a local responsive preview does not verify hosted operation.
- Schedule encrypted off-VPS PostgreSQL logical backups, Storage file backups
  (`volumes/storage`), and protected copies of encryption keys/private configuration.
  Include Auth/Storage metadata and migration history in your restore plan. A live
  file copy of PostgreSQL's data directory is **not** a safe database backup.
- Test restoration into an isolated stack. VPS snapshots alone are not enough.
- Monitor RAM, CPU, disk space/inodes, PostgreSQL connections and Docker log growth.
  Studio can stay deployed, but it is an admin tool, not a customer route.
- Before upgrades: back up, review the pinned release's notes, stage/test the new
  stack, then upgrade deliberately. Do not automatically change PostgreSQL major
  versions or regenerate JWT/encryption keys. Never delete volumes to fix a startup
  error; `docker compose down -v` and upstream reset scripts can destroy data.

Official references (re-check when changing versions):
[Dokploy installation](https://docs.dokploy.com/docs/core/installation),
[Dokploy Compose](https://docs.dokploy.com/docs/core/docker-compose),
[Supabase Docker self-hosting](https://supabase.com/docs/guides/self-hosting/docker),
[pinned upstream Compose](https://github.com/supabase/supabase/blob/self-hosted/v0.8.3/docker/docker-compose.yml).

</details>

---

## Common Problems

**`supabase start` fails or hangs**
→ Docker Desktop is not running. Open it, wait for it to finish, and run the command again.

**Port already in use**
→ Another Supabase instance may be running: `npx supabase stop`, then `npx supabase start`.
If port 3000 is busy for the app: `npm run dev -- -p 3001`.

**Login says network error / cannot connect**
→ Check that `.env.local` exists (step 4) and restart the app with `npm run dev`.

**Data looks wrong or you want a clean slate**
→ Verify the project/API URL and back up the database before troubleshooting.
For an existing database, apply pending forward migrations; do not reset/reseed
working accounts, transactions or uploads to fix a display/deployment problem.

**Cloning asks for a password / 404**
→ The repo is private. Ask to be invited on GitHub with the account you are signed in with.

---

## Useful VS Code Tip

Open the project folder in VS Code, then use **Terminal → New Terminal** inside VS Code —
you will already be in the right folder and can run all the commands above.
