# Menu save feedback

Menu Management remains `/menu` for staff/admin; customer shopping stays `/home`.

- Successful item/category/serving saves close the modal and show an accessible,
  dismissible success notification for six seconds.
- Server actions return a result and revalidate the menu/catalog instead of redirecting.
  The current table search and page remain intact (page is clamped if results shrink).
- Staff item creation says **submitted for admin approval**; the database still controls
  the pending/approved state. A successful save does not imply publication or stock.
- Failed saves keep the modal, text, category, checkboxes and selected image intact.
  Forms intentionally use native `onSubmit` rather than an action-form automatic reset.
- A shared synchronous submission lock, disabled fields/buttons and pending labels
  prevent double submits within the modal. Dismissal is blocked while saving.
- A transport failure says the save could not be confirmed: check the list before
  retrying rather than assuming a committed write failed.
- Item details and each serving still have separate save buttons; save their changes
  separately. Successful saves close the modal, so unrelated unsaved fields are not
  implicitly saved. Delete keeps its existing confirmation/redirect flow.
- Session role guards, database RLS, atomic create RPCs, upload signature/MIME checks,
  strict below-1-MB limit and failed-save image cleanup remain in place. Updates must
  return a permitted saved row before reporting success.

## Verification (2026-11-05)

- `npm run test:menu`: nine mocked action/security/validation/cleanup test groups.
- Full lint, TypeScript and Turbopack production build passed.
- Existing image, chatbot, GCash and report tests passed.
- Local standalone-production browser checks: item/category/serving create/save,
  refreshed list, preserved search/page, blocked double submission/pending dismissal,
  duplicate-item errors retaining all fields/file selection, and staff pending notice.
- Responsive light/dark checks passed at 1440/800/390/360 CSS pixels.
- Uniquely tagged local fixtures were removed; existing public-table and Storage-object
  hashes matched before/after. No orders or payments were placed, no database reset,
  migrations, historical edits or hosted deployment were performed.

Actual-phone and hosted-deployment verification remain separate and outstanding.

## Delete an individual serving

Each existing serving has its own **Delete** button beside Save, followed by a
confirmation dialog naming the serving/label. Cancel does not write anything.
Confirmed deletion uses the same inline result, shared submission lock and success
notification as saves; failures stay open, and search/page state is retained.
Success closes the edit modal, as with other successful menu changes.

The web change supports both old and migrated databases. When `retired_at` is
missing, Menu loading retries the legacy query and existing serving edits retry
without the new column. Only the specific missing-column/schema-cache error
enables this fallback; real permission/connection failures remain errors. Serving
Delete is disabled with an explanation until the migration is installed. Normal
adding/editing remains available. Apply `20261105020000_retire_menu_servings.sql`
manually to enable serving Delete. No working-database migration or deployment is
run automatically.
Deletion retires only the selected serving and takes it off sale. Menu management
hides retired servings; the catalog's existing active-only filter excludes them.
Existing order references, item/serving price snapshots, inventory/reservations and
audit history are not deleted or rewritten, so unfinished orders can still finish.
Other servings are unchanged. Retired rows cannot be put back on sale. An item may
have zero current servings (not orderable until a serving is added). A new serving
may reuse the removed name, but receives a new ID/inventory row; old stock is never
transferred automatically. Inventory history rows are deliberately retained.

`npm run test:menu` covers action authorization/confirmation/errors and inline
responses. To test the migration in a randomly named scratch database only, set
`MENU_TEST_DB_CONTAINER` to an approved local Supabase Postgres container and run
`npm run test:serving-delete:db`. This checks retirement, sibling/order/stock
preservation, stale/repeated deletion, name reuse and privilege restrictions. It
does not verify the live website or an actual phone.

Compatibility fix verification: lint and production build passed; the menu suite
now has 11 groups, including missing-column fallback and legacy price edits, plus
no fallback on permission/network errors. An authenticated local production HTTP
request rendered Menu against the existing unmigrated local database with serving
Delete disabled. No menu fixtures, working-database migrations or transaction edits
were required. Hosted/browser/actual-phone verification of this fix is outstanding.
