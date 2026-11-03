# Admin delivery areas and fees

Open **Admin → Delivery Areas & Fees** (`/admin/delivery-areas`).

- Expand **Add delivery location**, enter an approved name and non-negative PHP
  fee (up to two decimal places), choose availability, then review and confirm.
- Search by location name. Results show 10 locations per page; use Previous/Next
  or the numbered links. Searching starts at page 1 and paging keeps the search.
  Expand an existing location to edit its name or fee.
- Uncheck **Available at checkout** and confirm to deactivate; check it to restore.
- Expand a location and select **Delete location**, then confirm permanent deletion.
  Only unused locations can be deleted. A database foreign-key restriction blocks
  deletion if any order references the location, even during concurrent checkout;
  deactivate those locations instead. Existing orders keep their IDs, names and fees.
- Names are unique ignoring case and repeated spaces. Zero is a valid free fee.
- Active administrators only: page/action checks and database RLS enforce writes.
  Customers/staff/riders cannot change pricing or delete locations. Changes,
  including deletions, create activity logs.

Apply the forward migration using `npx supabase migration up --local`; never reset
or reseed a working database. The migration adds permissions, validation, normalized
uniqueness and audit triggers; it does not change existing location prices or orders.
Admin edits are database records, not Git changes. Different installations must
manage their own prices, or use a separately reviewed data migration to distribute
owner-approved changes.

Regression: `supabase/tests/admin_delivery_areas.sql` runs fixtures inside a rollback
transaction. It checks admin edits, normalized duplicates, permissions, activation,
audit entries and preservation of existing orders. Use local seeded test accounts.
`supabase/tests/delete_delivery_areas.sql` also verifies unused deletion, deletion
audit, blocked non-admin/guest/inactive-admin deletes and the order-history FK guard.
