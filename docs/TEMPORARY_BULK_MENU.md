# Temporary menu setup — retired

At the owner's request, the temporary Bulk Add link, routes, server action,
encoded photo catalog, import helper and dedicated tests have been removed.
Normal Menu Add/Edit/Delete and serving management remain available.

This is a code-only removal. It does not delete or modify any saved menu items,
servings, images, stocks, reservations, orders or transaction history. No SQL
migration, reset, reseed or cleanup operation is required. Existing saved rows do
not depend on the importer code. This change does not verify that every intended
menu entry was previously imported into production.

The previous catalog/import implementation remains in Git history at `0ff9bbf`.
Do not replay it or reset stock to restore menu data. Investigate any missing or
incomplete entries through normal admin CRUD instead.

Deploy the updated web service to remove the feature from the hosted website.
Old `/menu/bulk-add` and `/menu/import` URLs no longer expose an import page/action.
