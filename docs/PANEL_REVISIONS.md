# Panel revisions — November 24, 2026

| Comment | Implementation / verification location |
| --- | --- |
| Monotone checkout | Numbered bold sections, stronger entered values, bold selected delivery area, highlighted payment selection; same consistent typeface |
| Manual GCash | Customer-facing option renamed **GCash**; QR, reference details, staff verification and all computations unchanged |
| Numeric star feedback | Live prominent `4.0 / 5` score while selecting stars on a delivered customer's order |
| Maximize space | Dashboard shells fill viewport width, no centered 1440px floating frame, desktop outer padding/rounding removed; landing content and checkout/order detail width expanded |
| Address upfront | Hero displays existing database restaurant address beside the branding; no invented branch address |
| Admin feedback visibility | Admin sidebar → **Rider Feedback** (`/admin/feedback`); original comments, scores, consent and moderation status |
| Review before publishing | New ratings saved privately as pending. Admin may approve an opted-in 4–5-star comment, keep private/unpublish, or return to pending |
| Positive public feedback | Landing **Customer testimonials**, approved excerpts with initials only, explicitly labeled selected positive feedback, not an overall score |
| Honest internal rating | Existing internal rider averages still include **all** valid ratings, including pending/private/negative. No scores or historical original comments rewritten |

## Deployment

Apply **only** `supabase/migrations/20261124010000_moderate_rider_feedback.sql`
to the existing production database using the approved administrator connection,
then deploy the web code. Do not reset/reseed or blindly push unreconciled migration
history. New submission RPC/admin queue require this migration. Public landing
fails closed and omits testimonials if unavailable; it never falls back to fake reviews.

The original 3-argument rating RPC remains available for older clients; its ratings
have no publication consent. New clients use a consent-aware wrapper that reuses
the original own-delivered-order/once-only checks in the same transaction.
Unchecking consent is the default; no customer needs to grant it to rate a rider.
Historical feedback remains private unless future, separately authorized consent
is obtained—this revision does not invent or backfill consent.

Only active admins moderate/read the private queue; customers can still read their
own original rating. Rider/staff raw-comment access is removed; existing authorized
aggregate internal rider summaries are retained. Public RPC returns only testimonial
ID, initials (up to 3 letters), numeric score and the admin-reviewed public excerpt.
No customer/order/rider IDs or full names are included in the public payload.
Deleted customers are omitted. Admins must redact PII from excerpts without changing
meaning before approval. The original comment remains private and unchanged.

## Verification

- `node scripts/test-panel-revisions.mjs`: mocked action/UI and SQL-source checks.
- With an explicitly approved LOCAL Postgres container available, set
  `FEEDBACK_TEST_DB_CONTAINER` then run `npm run test:feedback:db`. This creates and
  drops only a uniquely named scratch database, tests original + new SQL and RLS,
  and does not apply migrations to the working restaurant database.
- `npm run test:discount-request`, `npm run test:gcash`: notes-only discounts and payment regression.
- `npm run build` then `npm run test:dashboard-scroll`: actual installed headless
  browser geometry using built CSS/mocked SSR shells, not hosted/phone verification.
- After SQL/web deploy, verify own delivered-order eligibility, duplicate submission
  rejection, consent, admin-only access, pending/private not public, 1-star feedback
  retained in admin and internal averages, approved 4–5-star excerpt with initials,
  unpublish, and selected address/GCash/checkout layout on actual phones.
- Local Docker unavailable during implementation: production migration has **not**
  been applied by the coding agent. Real PostgreSQL behavior must be verified before
  claiming DB/live completion. No test creates a real order/payment/rating.
