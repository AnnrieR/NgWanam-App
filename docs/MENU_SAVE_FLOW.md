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
