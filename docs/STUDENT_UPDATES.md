# Student update guide and migration review

## Existing laptop/database — keep your data

These instructions apply **after the GitHub pull request has been merged into
`main`**. A pushed feature branch or open PR is not yet part of `main`.

1. Open Docker Desktop and wait until it is running.
2. Stop Next.js with `Ctrl + C` in its terminal.
3. Open a terminal in the existing cloned `ngwanam` folder. If needed, use
   `cd "YOUR-PROJECT-PATH/ngwanam"` with your actual path.
   Confirm that **both `package.json` and `supabase/config.toml` are in this
   folder**. Do not run from a parent folder, another old copy, or a nested clone
   that has not received the latest files. In PowerShell:

   ```powershell
   Get-Location
   git rev-parse --show-toplevel
   Test-Path .\package.json
   Test-Path .\supabase\config.toml
   ```

   Both `Test-Path` results must be `True`; the Git root should be this project.
4. Run commands **one at a time**, checking for errors:

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

Open http://localhost:3000 and refresh. If the old interface still appears,
hard-refresh or close/reopen the tab.

**Stop if any command fails.** If `git status` shows uncommitted edits, preserve
them before switching/pulling; do not automatically reset, restore, or stash-pop.

### What gets updated?

| Command | What it does |
| --- | --- |
| `git pull --ff-only origin main` | Downloads merged code, migration files, docs and lockfile; refuses a divergent merge. |
| `npm ci` | Installs the exact dependency versions in `package-lock.json`, including the tested Supabase CLI. |
| `npx supabase start` | Starts your local Supabase services. On first setup it initializes the database; an existing database is retained. |
| `npx supabase migration up --local` | Applies only missing migrations to the local database. Does not rerun the seed. |
| `npx supabase migration list --local` | Compares files with the local database migration history. Versions should match after a successful update. |
| `npm run dev` | Starts the updated application. |

**GitHub does not synchronize local databases.** Each student keeps their own
accounts, orders and uploaded files. Pulling code does not copy the developer's
database or uploaded Storage objects. Public images committed in `public/`
do travel with Git. Do not distribute a database dump or service-role key as
part of the PR.

## Environment variables

Keep the existing ignored `.env.local`; do not overwrite it on every pull.
Compare variable **names** with `.env.example`. Use your own local values from:

```bash
npx supabase status
```

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your local public/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<your local server-only service-role key>
```

The service-role key is required for Admin User Management create/delete.
Never prefix it with `NEXT_PUBLIC_`, commit it, paste it into a chat, or include
it in a screenshot. Restart Next.js after changing `.env.local`.

## Do not use these for an ordinary update

- `npx supabase db reset`: destructive; rebuilds the database and seeds local
  accounts/menu. Only for a new/disposable setup or explicitly approved wipe.
- Rerunning `supabase/seed.sql`: changes demo accounts/menu and stock defaults.
  It is not an incremental updater.
- `npx supabase db pull`: downloads a **remote schema**; it is not how students
  apply SQL files after a Git pull.
- Bare `supabase db push` / `--linked`: may target a linked cloud project. This
  demo uses **`migration up --local`** explicitly.
- `migration repair`, SQL pasted manually, or deleting migration history: do
  not use to hide failures. Ask for help with the exact error first.

## Troubleshooting

### Git says local changes would be overwritten

Run `git status`. Preserve your own edits in a commit/branch before continuing.
Do not blindly discard them. If `--ff-only` reports divergent branches, ask the
group maintainer to reconcile the history; do not force-push or reset.

### Supabase/Docker is not running

Open Docker Desktop, wait for it to finish starting, then retry `supabase start`.
If the CLI says the stack is already running, continue to migration up.

### Reservation migration reports insufficient on-hand stock

The upgrade deliberately refuses to invent stock or cancel real orders. Stop
the app and ask the maintainer to inspect actual open orders versus on-hand
stock. Make only authorized inventory corrections/cancellations, then retry.
Do not reset the database or skip the migration to hide the mismatch.

### Migration history does not match / migration fails

Stop at the error. Save the output and `migration list --local` result, hiding
keys and connection secrets. Check that you pulled the merged branch. Already
applied migrations are not supposed to be manually replayed.

For `Remote migration versions not found in local migrations directory`, the
word "Remote" may still refer to your **local Docker database history** when
using `--local`. Confirm the project root and correct clone first, then confirm
`git log -1 --oneline` and the files in `supabase/migrations`. Do not repair or
reset to make a wrong/stale folder match the database.

### New account management buttons fail

Verify migrations finished, `.env.local` has the server-only service-role key,
and Next.js was restarted. Delete refuses your own admin account and accounts
with unfinished customer orders/assigned deliveries. Historical account UUIDs
are retained as anonymized records to preserve transaction links.

## New laptop

Follow the first-time setup in `README.md`. A fresh local stack initializes all
migrations and the current seed. If an explicit clean reset is needed, use it
only on that new/disposable database; never as a routine update command.

## Maintainer PR checklist

- Put the complete source changes, `package.json`, `package-lock.json`,
  `.env.example`, SQL migrations, seed and docs into the review branch.
- Exclude `.env.local`, service-role keys, database dumps, `node_modules`,
  `.next`, local Supabase `.temp`/`.branches` and test-browser files.
- Open a **pull request with base `main`**, review it, then merge. Students pull
  only after the merge. Directly pushing to `main` is a different workflow.
- Keep migration timestamps unique and ordered. Do not rename/delete applied
  migrations. Use a new forward migration for schema corrections.

## Current release — 20 October 2026

There are **45 ordered migration files**, ending at
`20261020040000_correct_bauan_delivery_area_name.sql`. The seven migrations after
the previous 8 October release cover:

1. Targeted removal of the former daily generator, retaining manual/proof-bearing
   orders and on-hand stock (see the cleanup caveat below).
2. Live inventory publication and stale-save protection.
3. Customer delivery ratings with guarded writes and role-limited reads.
4. Per-account, forward-only in-app notifications (no historical alert replay).
5. Approved delivery areas, area snapshots and authoritative checkout pricing;
   one replacement ordering RPC signature, no flat-fee bypass.
6. Once-only stock deduction at Rider Delivered with proof, or Staff Completed
   for pick-up; no historical stock backfill.
7. Bauan / Aplaya naming correction, preserving area ID, fee and saved orders.

No new environment variable or dependency installation method is required.
Existing accounts, manually created orders and uploaded files stay local.
The obsolete daily generator is deliberately **not** restored.

Current fresh-replay, previous-main upgrade and regression results:
[MIGRATION_REVIEW_20261020.md](MIGRATION_REVIEW_20261020.md).

### Optional sample sales are separate

The developer's 28 sample past sales are **not included in Git or migrations**.
Ordinary pull/start/migrate commands do not insert them. Reports use each
student's own records, so empty periods legitimately have zero sales.

If the group explicitly wants synthetic local history for a presentation, see
[LOCAL_SALES_HISTORY.md](LOCAL_SALES_HISTORY.md) for the opt-in add/check/cleanup
commands. This is not part of the normal update and must not be presented as
actual restaurant revenue. No real stock or payments are transferred by Git.

## Historical migration review — 8 October 2026

### Update — 18 October 2026: no daily generated orders

The current seed creates local accounts and menu/stock only, **not orders,
payments or deliveries**. The incremental migration
`20261018010000_remove_daily_demo_orders.sql` removes former October daily
generator records using their combined account/date/contact/phone/address/
order-line/payment fingerprint. Manually placed orders on Test Customer are
retained. Rows with real delivery-proof uploads are retained for manual review.
Demo reservations are released; on-hand quantities are not changed. Apply via
`npx supabase migration up --local`; no reset is required.

The verification below is a historical record of the 8 October review, before
the explicitly requested removal of daily demo transactions.

Reviewed all **38 SQL migration files**, their chronological dependencies,
function replacements, grants/RLS, Storage buckets, data conversions and seed.
Supabase CLI is pinned to **2.120.0** as a development dependency.

### Corrections

1. `20261008040000_repair_open_order_reservations.sql`: fresh CLI replay failed
   with `LOCK TABLE can only be used in transaction blocks`. Moved the lock,
   checks and reconciliation into one `DO` statement, which executes atomically.
   The filename/version is unchanged. Already-applied databases do not rerun
   it; the change makes pending/fresh application work with the CLI. This is a
   narrowly scoped replay fix, not a rewritten historical schema.
2. New forward migration `20261008110000_preserve_deleted_menu_history.sql`:
   made `order_items.menu_variant_id` nullable to match its existing
   `ON DELETE SET NULL`, and made historical inventory-movement references
   nullable/`SET NULL`. Deleting a finished item's stock no longer fails on
   history references; historical line names/prices/movement quantities remain.

### Tests performed

- **Fresh replay:** separate Supabase project/database on alternate ports,
  all 38 migrations plus current seed, succeeded. Five demo accounts with
  correct roles; COD/GCash only; zero reservation mismatches.
- **Existing-client simulation:** reset only the disposable project to
  `20261006134122`, loaded the original repository seed, then used
  `migration up --local` to apply the 16 pending migrations without a reset.
  All 233 orders/payments and five profiles retained; payment amounts,
  statuses and creation dates unchanged; on-hand stock unchanged. Exactly
  90 legacy Card payments converted to COD.
- Rollback-only SQL regression: active-customer/approval guards, pickup,
  reservation/release/deduction, completion timestamp, cancellation, proof
  requirement and no automatic GCash gate passed.
- `supabase/tests/migration_review.sql`: reservation/payment/upload checks
  and authenticated Menu deletion with historical receipt/movement retention
  passed, rolling back its generated fixture.
- Applied the forward migration to the working local database using the same
  `migration up --local` command. No user orders were reset/reseeded.

These are local Postgres 17/CLI tests, not a hosted production deployment test.
The obsolete `card` enum remains intentionally for migration compatibility;
the final payment constraint/RPC prohibit it. Existing uploaded images are
retained; new uploads are strictly smaller than 1 MiB. Old completion/proof
records without real milestones are not fabricated.
