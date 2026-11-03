# Pre-PR migration and student-update review — 20 October 2026

## Scope

- 45 unique ordered SQL migrations, ending at
  `20261020040000_correct_bauan_delivery_area_name.sql`.
- The 38 migrations already on `origin/main` are byte-equivalent after line-ending
  normalization. None were renamed, deleted or rewritten for this release.
- Reviewed the seven forward migrations: targeted old-generator cleanup, checked
  inventory edits, ratings, notifications, delivery pricing, rider stock deduction
  and the Bauan name correction. No additional migration fix was required.
- Expanded the delivery-fee regression to require all four confirmed PHP 150
  corrections and the final Bauan / Aplaya name.

## Verified

1. **Fresh installation:** a separate Supabase project/container on alternate
   ports replayed all 45 migrations and the current seed successfully. This did
   not reset the working database. The current seed has no daily order generator.
2. **Previous-main upgrade:** rebuilt only that disposable project to migration
   `20261008110000`, using the old main seed (228 generated orders on this run).
   Added two manual transaction fixtures and protected one historical order with
   proof metadata. Applied the seven pending migrations with
   `supabase migration up --local`. Both manual orders and the proof-bearing order
   survived unchanged; exactly 227 fingerprint-matched generated orders were
   removed. All on-hand quantities, thresholds, profiles, retained item/payment
   snapshots and Storage rows matched the baseline. Reservation totals reconciled.
3. **Rollback regressions:** `migration_review.sql`, `inventory_alerts.sql`,
   `delivery_ratings.sql`, `notifications.sql`, `delivery_fees.sql` and
   `rider_stock_deduction.sql` passed on both the fresh project and working local
   database. Hashes across 18 tables were identical before/after the six suites.
   PostgreSQL identity sequence gaps from rolled-back inserts are expected.
4. **SQL lint:** public/private schemas passed `supabase db lint --local` at error
   level. Working local migration history matches all 45 files; another migration
   up is a no-op.
5. **App checks:** ESLint, TypeScript, strict image-validation tests and production
   build passed. The build used its own `npm ci` in a separate copy, preserving
   the active dev server's output. An initial Windows cross-root dependency
   junction was rejected by Turbopack; installing dependencies normally resolved
   that test-setup limitation without a source workaround.

## Important boundaries

- The cleanup migration intentionally removes only old-generator fingerprints;
  it is not a promise that every historical generated transaction is retained.
  Manually placed and proof-bearing orders are protected.
- Historical stock, completion/proof milestones, delivery fees and labels are
  not fabricated or backfilled by this release.
- The optional 28-sale fixture runner is explicit/local-only, outside migrations
  and the normal seed. Pulling the repo does not copy the developer's sample
  transactions or local private manifest. See `LOCAL_SALES_HISTORY.md`.
- `npm audit --omit=dev` found zero reported vulnerabilities at review time.
  Full audit reported eight high-severity **development-toolchain** findings
  involving shadcn/ts-morph and ESLint-config transitive dependencies. No forced
  dependency upgrade was bundled into this migration release; review those
  separately before a production rollout.
- This is local desktop/Postgres 17/CLI 2.120.0 verification, not a hosted
  deployment, physical-printer or actual-phone test. Unconfirmed delivery-guide
  entries remain excluded rather than guessed.

## Student handoff

Merge the PR into `main` first. Then follow `STUDENT_UPDATES.md` from the correct
project root: `git pull --ff-only origin main`, `npm ci`, `supabase start`,
`supabase migration up --local`, `supabase migration list --local`, `npm run dev`.
Keep each student's existing `.env.local`, database and uploaded files. Stop on
errors; no ordinary update requires reset, reseed, repair or stash restoration.
