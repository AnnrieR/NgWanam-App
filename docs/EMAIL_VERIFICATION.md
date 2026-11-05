# Email/password registration requires verification

New local-password registrations create pending Auth/profile records. They cannot
sign in or access protected application pages until Supabase confirms the email.
No existing accounts, roles, transactions or confirmation timestamps are rewritten.
Verified Google sign-in remains its existing verified-provider flow; it does not
need a second application confirmation email. Admin-created operational accounts
retain the separate admin-controlled provisioning workflow.

## Required production settings

1. In the **existing Supabase service**, set `ENABLE_EMAIL_AUTOCONFIRM=false`.
   An existing explicit `true` overrides the new Compose default, so a web-only
   deploy is not enough. Redeploy the affected Auth service without removing DB
   volumes, changing passwords/keys, reseeding or applying unrelated migrations.
2. Configure working SMTP privately (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME`). Do not paste credentials
   into chat/logs. Verify the sender/domain with the mail provider.
3. Keep web `AUTH_SITE_URL=https://ngwanam.store` and preserve the existing Auth
   redirect allowlist, including `https://ngwanam.store/auth/confirm` and the
   existing password-reset/Google callback URLs. Redeploy the web update.
4. The public `/auth/v1/settings` response must have `mailer_autoconfirm:false`.
   The app checks this setting without caching **before** creating a password
   account. Unknown/true/unavailable settings disable registration instead of
   accidentally creating an auto-confirmed account. No service-role key is used.

## Actual hosted verification (not covered by local mocks)

- Register one intended new test email: see the check-inbox message, no session
  and no automatic navigation to Home. Check inbox/spam and actual mail delivery.
- Try password sign-in before clicking the link: it must be rejected.
- Click the real link in the browser that started signup (default PKCE flow).
  `/auth/confirm` supports both PKCE codes and token-hash templates; only a verified
  response can create an authorized session. Expired/reused/invalid links fail.
- After confirmation, normal login/order behavior should work. Pending records in
  Studio are expected; they are not verified/usable registrations yet.
- Existing confirmed password users and verified Google users must still sign in.
  Do not deconfirm legacy accounts or resend to all customers as part of deployment.

This change does not provide a new resend-email UI. If delivery fails, inspect
Supabase Auth/SMTP delivery logs privately and fix configuration before retrying.
PKCE links opened on a different browser may fail to exchange; sign in normally
after successful provider verification or restart the intended confirmation flow.
