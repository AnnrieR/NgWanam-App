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

## Common Problems

**`supabase start` fails or hangs**
→ Docker Desktop is not running. Open it, wait for it to finish, and run the command again.

**Port already in use**
→ Another Supabase instance may be running: `npx supabase stop`, then `npx supabase start`.
If port 3000 is busy for the app: `npm run dev -- -p 3001`.

**Login says network error / cannot connect**
→ Check that `.env.local` exists (step 4) and restart the app with `npm run dev`.

**Data looks wrong or you want a clean slate**
→ `npx supabase db reset` (deletes local data and reloads the sample menu).

**Cloning asks for a password / 404**
→ The repo is private. Ask to be invited on GitHub with the account you are signed in with.

---

## Useful VS Code Tip

Open the project folder in VS Code, then use **Terminal → New Terminal** inside VS Code —
you will already be in the right folder and can run all the commands above.
