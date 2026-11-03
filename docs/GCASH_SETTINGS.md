# Admin-managed manual GCash

Open **Admin → Admin Settings → GCash Payment** (`/admin/settings`).

1. Enter the actual registered **GCash account name** and **account number**.
2. Optionally upload the actual payment QR: PNG, JPEG or WebP, **strictly below 1 MB**.
3. Check **Enable manual GCash at checkout**, review the destination, then confirm.
4. Verify the name/number and QR destination using the GCash app before accepting
   customer transfers. The website does not decode or certify QR recipients.

The checkout displays these dedicated recipient fields, never restaurant contact
numbers. The sender name/number/reference inputs remain customer payment details.
Payments remain manual and require staff verification; this does not integrate a
GCash payment gateway, send money, or automatically mark payments paid.

## Safe default and updates

`20261104010000_admin_gcash_settings.sql` adds nullable recipient fields and an
enabled flag. **Initially disabled**, with no inferred/copied wallet numbers.
An admin must configure and enable the real account. COD remains available.
Existing payment/order records, phone numbers and old QR settings are not rewritten.

Use `npx supabase migration up --local`; never reset/reseed an existing database.
Hosted Supabase must receive the same migration before the corresponding app update.
Admin-entered destination changes are database records, not Git changes.

Disabling GCash prevents new GCash orders (UI and database RPC), not verification
of existing GCash payments. Existing pending payments still appear in monitoring.
Changing recipient settings does not rewrite historical sender/payment records.
Customers with an old checkout should refresh before making a transfer.

## Permissions and images

- Active administrators only: page/action guards and dedicated database RPC.
- The old staff-accessible ordering-settings RPC can no longer change QR/payment
  details. It is admin-only and preserves the payment QR.
- Updates compare `updated_at` under a row lock to reject stale edits.
- Each settings save creates an activity-log entry, without copying account details
  into log messages.
- Public `gcash-qr` Storage bucket: only active admins upload; all uploads are
  immutable unique objects. The current referenced image cannot be deleted directly.
- Browser/server/Storage enforce the below-1-MB limit; server checks file signatures
  against MIME. Fake file extensions or SVG uploads are not accepted.
- QR preview uses the complete image with `object-contain`, not menu-photo cropping.
- QR images are public payment instructions, not private identity documents.

## Local verification

- `npm run test:gcash`, full lint/TypeScript, Turbopack production build, and existing
  image/chatbot/report tests passed.
- `supabase/tests/gcash_settings.sql`: rollback-only checks for recipient validation,
  stale updates, admin/non-admin/inactive/guest permissions, legacy bypass protection,
  disabled-payment rejection and unchanged orders/payments/contact numbers.
- Updated delivery fee SQL regression passed with explicitly configured rollback-only
  GCash fixtures; COD, pick-up, reservations and saved delivery fees remain covered.
- Actual local Storage API boundary/MIME/role checks passed.
- Browser: confirmed save/cancel, +63 normalization, optional QR upload/preview/remove,
  current-image deletion guard, dedicated customer recipient display and disabling;
  admin layouts passed light/dark at 1440/1024/800/390 CSS widths.
- Temporary browser/storage test settings and uploads were cleaned up/restored.

These checks are local, not actual-phone, real-transfer or hosted-deployment verification.
