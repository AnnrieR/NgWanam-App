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

## Container-origin redirects and expired links

The email callback now builds both success and failure redirects from the validated
web `AUTH_SITE_URL`, not the request origin (which can be `http://0.0.0.0:3000`
inside the container). Untrusted Host/forwarded headers are not used. Provider
error parameters fail closed without attempting to exchange an accompanying code.

In Supabase keep `SITE_URL=https://ngwanam.store` and preserve
`ADDITIONAL_REDIRECT_URLS` with the email, password-reset and Google callbacks.
The web redirect fix requires deploying the web service; changing the Supabase
environment requires redeploying Auth too. No database migration/reset is needed.

`otp_expired` is a separate provider error: a link can be expired, already used or
otherwise invalid. Correcting the redirect does not revive the token or prove an
account was confirmed. Try password login on the public site; unverified users
must still be rejected. If needed, obtain a fresh verification email through the
existing administrator/Auth support flow, and open only the newest link in the
signup browser. Do not delete the account, mark it confirmed manually, disable
verification or share the full email link/token in diagnostics.

Local regression tests simulate internal and hostile request origins, successful
and failed code exchanges, missing tokens, unconfirmed sessions, provider errors
and unsafe `next` values. They do not verify hosted mail delivery or browser flow.
