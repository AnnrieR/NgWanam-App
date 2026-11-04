# Google account deletion and visible diagnostics

## Failure

The initial Google identity guard rejected GoTrue's soft-delete operation. Pinned
GoTrue v2.197.0 first obfuscates `auth.users.email` and sets `deleted_at`, then
empties each identity's `identity_data` and obfuscates `provider_id`. The original
guard interpreted that empty Google identity as an unverified login and rolled
back Auth's transaction. The earlier preparation RPC had already deactivated the
profile, so the account could remain visible/inactive.

This is a reproduced code defect, not proof that every hosted deletion failure
has the same cause. Missing service-role configuration, database permissions,
unfinished work, and profile cleanup can also prevent completion. Browser console
silence is expected when server actions return a handled error; the UI must show it.

## Repair and deployment

1. Preserve a recent production backup. Leave affected accounts inactive; never
   manually delete their Auth/profile rows or disable the Google guards.
2. In the existing **db** container's terminal, use `supabase_admin` (the checked
   migration administrator), not the Studio `postgres` role. Run
   `supabase/migrations/20261105030000_allow_google_identity_soft_deletion.sql`
   inside `BEGIN; ... COMMIT;` with error-stop and a short lock timeout. On error,
   roll back. This replaces the guard function only; no user/order rows are edited.
3. The exception permits only UPDATE cleanup to empty identity data on an already
   soft-deleted Auth user, without moving user/provider ownership. No new identities
   or returning authentication are accepted for deleted users. Live users still
   require Google's verified same email; explicit single-use link approval remains.
4. Push and deploy the web update to the existing `ngwanam-web` service. Deletion
   uses a native confirmed submit with a synchronous duplicate lock. Failures stay
   visible inside the dialog with a diagnostic reference; the list refreshes even
   after partial failure. Configuration is checked before deactivation. Success
   requires a returned profile row; anonymized profiles are excluded from the list.
5. In web service logs, search `[account-delete]`. Diagnostics include stage,
   allowlisted-format error code and numeric status, never raw provider messages,
   email addresses, account IDs, keys, passwords or tokens. Auth-stage failures may
   require the Supabase **auth** service logs to identify the underlying DB error.
6. Retry Delete from User Management for the intended inactive account. Existing
   order/payment/delivery references are retained. Do not bulk-delete accounts to
   test. An already soft-deleted Auth user can finish a failed profile-cleanup retry.
   If avatar cleanup fails, show a warning rather than silently claiming completion.

The previous Google/serving migration files should not be run again. Record all
manually applied migration versions in deployment records and reconcile migration
history before any later automated migration run; do not blindly replay them.

## Local verification

- `npm run test:account-delete`: mocked admin/self/confirmation/unfinished-work/
  last-admin/configuration guards, Auth/profile errors, retry results, anonymization,
  soft-delete-only calls, avatar warnings and sanitized logging.
- `GOOGLE_TEST_DB_CONTAINER=<approved-local-container> npm run test:google:db`:
  random scratch DB reproduces the original trigger failure, tests GoTrue's cleanup
  sequence after the patch and re-runs the existing Google security SQL suite.
- No hosted account is deleted by these tests. Live success must be verified after
  the migration and web deployment; mocked/SQL tests are not a live Auth API test.
