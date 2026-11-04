# Google registration, login and explicit linking

Google authentication is **off by default**. Existing email/password login remains
available. This implementation accepts Google accounts (Gmail and Workspace/custom
email accounts) only when Google's provider identity says `email_verified: true`.
It does not infer verification from editable user metadata. Verified Google users
do not receive or need a separate Ng Wanam email-confirmation step.

## Security and account behavior

- New Google accounts receive the existing customer profile/default role. Google
  claims never select an administrator/staff role.
- A database expression index enforces one user per trimmed, case-insensitive
  email, including SSO rows. Concurrent writes are covered by PostgreSQL uniqueness.
  Gmail dot/plus aliases are not rewritten into other addresses.
- Default Supabase automatic matching is **not trusted**. A trigger rejects a new
  Google identity on an existing user unless that user has explicitly authorized
  linking with a fresh password sign-in. Rejection rolls back Auth's transaction,
  before a linked identity/session can be issued. Hiding a button is not the guard.
- Existing users sign in normally, visit **Account → Account security**, re-enter
  their password, approve linking, and authenticate with Google using the **same
  verified email**. The password-check session is transient and signed out locally;
  the user's existing browser session is not replaced by the password check.
- The database checks signed JWT password AMR age (60 seconds), account confirmation
  and active profile. A single-use, five-minute permission allows completion of the
  explicitly approved Google link. During that consent window, an OAuth attempt for
  the same user/email can consume the permission; it is not a browser-tab-bound grant.
  Rejected/abandoned attempts leave at most the short-lived permission, not a linked
  account. Never expose the private permission table to clients.
- New registrations receive a separate initial permission from an Auth-user insert
  trigger. Both registration and linking must pass the provider verification trigger.
- Returning Google identity updates also require verified, same-email claims.
  Linked identities cannot move between user IDs. Existing IDs, profiles, roles,
  orders, payments and stock are not merged/reassigned/backfilled.
- Existing unconfirmed local accounts must first confirm/recover the existing
  account; knowing an unconfirmed password alone is not enough to link.
- The app uses Supabase PKCE cookies and a five-minute flow cookie. Callback checks
  the server-validated user/identity, linking user ID and active database profile.
  Redirect destinations use configured `AUTH_SITE_URL`, never a supplied `next` URL.
- Duplicate email attempts show non-enumerating guidance, not a public account lookup.
  If a user forgot the existing password, use recovery instead of creating a second
  account. Recovery requires configured real SMTP.

## Deployment — manual, ordered, no automatic migrations

1. Back up the database and preserve existing service secrets/volume names. Keep
   `GOOGLE_AUTH_ENABLED=false` in **both** app and Supabase services initially.
2. Review and explicitly apply the repository migrations through
   `20261105010000_google_identity_guards.sql` to the intended database using the
   project's normal controlled migration procedure. Students updating a local
   checkout use `git pull --ff-only origin main`, `npm ci`, then
   `npx supabase migration up --local` from the correct root. Never reset/reseed.
   The new migration adds Auth-table triggers/index and a private permissions table;
   it does not rewrite existing rows. If duplicates already exist, the unique index
   fails: stop and investigate ownership; **do not delete or merge users automatically**.
3. In Google Cloud, configure an OAuth consent screen and a **Web application**
   OAuth client. Google authorized redirect URI must be exactly:
   `https://YOUR_API_DOMAIN/auth/v1/callback` (the Supabase callback, not the app).
   Configure consent-screen test users if the Google project is still in testing.
   Request only the built-in Google OIDC/profile/email scopes; no Gmail inbox access.
4. In the existing Supabase Dokploy service (`ngwanam-supabase-owup3a`), set:
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (server-side Auth only).
   - Append `https://YOUR_APP_DOMAIN/auth/google/callback` to the existing
     `ADDITIONAL_REDIRECT_URLS`; **preserve existing confirmation/recovery URLs**.
   - `GOOGLE_AUTH_ENABLED=true` only after step 2. Compose wires Google and manual
     linking into pinned GoTrue `v2.197.0`. Do not enable skip-nonce/email-verification
     flags. Re-deploy the existing service, not a replacement stack.
5. In `ngwanam-web`, set `GOOGLE_AUTH_ENABLED=true` and
   `AUTH_SITE_URL=https://YOUR_APP_DOMAIN`. Deploy the web update. OAuth secrets
   do not go in the app, public build arguments, source control, screenshots or chat.
   App requests also fail closed if the guard-migration readiness RPC is absent.
6. Verify with designated accounts: new verified Google signup, returning login,
   local-email collision rejection, wrong-password/different-Google-email rejection,
   explicit successful link preserving the existing user ID/history, and inactive
   account rejection. Test cancelled/expired consent and two different browsers.

For local OAuth, explicitly configure the Google provider in `supabase/config.toml`
with env-backed client ID/secret, the local Supabase callback URL and exact app
callback allowlist. Set `enable_manual_linking=true` **only after migration**.
The committed local provider remains disabled/unconfigured. Never copy production
secrets or the original project's `.env.local` for tests.

Disable Google in **both** services to pause the feature; hiding the app button alone
does not disable the Auth API. Keep the guards installed for existing identities.
Review/regression-test Auth triggers whenever upgrading Supabase Auth. Roll back app
configuration rather than dropping protective constraints while Google is enabled.

## Verification scope

Local lint, TypeScript/production build, Google action/callback mocks, isolated SQL
guard tests, existing menu/image/GCash/chatbot tests and the 13 offline Supabase
configuration test groups passed during implementation. No migration was applied
to the working application database and no hosted service was redeployed.

- `npm run test:google`: mocked action/ownership/consent and redirect/identity checks.
- `GOOGLE_TEST_DB_CONTAINER=<approved-local-container> npm run test:google:db`:
  creates/drops one randomly named scratch database, testing the real migration with
  a minimal Auth-shaped schema. Never migrates the application database. Requires
  a local Supabase Postgres container with its standard `anon`/`authenticated` roles.
- This SQL test is not a complete GoTrue/Google OAuth integration test. Live Google,
  actual-phone and hosted verification require the configured OAuth client and the
  manual deployment steps above; do not claim those tests passed from mocked tests.
