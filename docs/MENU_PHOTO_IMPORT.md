# Supplied menu photo import (image-only)

## What is included

67 food photos from the supplied `NG WANAM MENU pics` folder are prepared in
`public/prepared-menu-photos/`. These are real food photos, not the old price-sheet
catalog. Originals remain untouched. The WebP copies preserve aspect ratio, fit
within 1100×1100 pixels, use quality 85 and are **strictly below 1,000,000 bytes**
each (also below the existing strict 1 MiB upload limit).

`src/lib/menu-photo-assets.json` records source names, exact permitted recipe
aliases, byte lengths and SHA-256 hashes. `scripts/prepare-menu-photos.mjs` can
reproduce the preparation using the Sharp dependency installed with Next:

```powershell
node scripts/prepare-menu-photos.mjs "C:\path\to\NG WANAM MENU pics"
npm run test:menu-photos
```

## Apply to the deployed database

Deploy the web changes, then sign in as an existing **admin** and open:

`https://ngwanam.store/admin/menu/photos`

Or select **Import menu photos** in **Admin → Menu approvals**.

1. Review each photo and its exact menu-item match.
2. Check the confirmation, then click **Save matched photos to database**.
3. Keep the page open while it saves sequentially. Check each result.
4. Refresh the preview and check the customer menu after completion.

The page previews actual database rows; it never claims that all 67 photos can be
assigned. Missing products, duplicate names, competing photo sources, unapproved
items and ambiguous recipes are skipped with reasons. Existing nonempty photo
URLs are preserved, including broken URLs (replacement needs separate review).
Unmatched photos are not grounds to invent products, prices or stock.

Each action authenticates the admin again, reads current items, validates the
fixed bundled photo/hash/signature/size and uploads it to the existing
**Supabase Storage `menu-photos` bucket** using normal authenticated RLS. It then
saves that public URL to **`menu_items.image_url`**. This is not a frontend-only
fallback, and no service-role key or new credentials are required. The bundled
public preview copy remains in the web deployment as well.

Only `image_url` is updated (normal database audit/update timestamps may run).
No insert/delete of menu items, variants, accounts, inventory, orders or payments;
no reset, reseed, approval changes or price/stock rewrites; no database migration.
All servings of a menu item share its photo under the existing schema. Different
serving/lahok photos cannot safely be assigned to one field at the same time.

## Deliberate review cases

- `Fried Chicken W_ Vegetables`: whether HongKong Style and the distinct Salo-Salo
  recipe are the same has not been confirmed. Neither is assumed.
- Family-size noodle photos and generic `PANCIT TRAY`: recipe/lahok/serving identity
  can overlap existing noodle products; unmatched/ambiguous images need review.
- `Fish & Chips` is allowed to match that exact recipe even though its source
  folder says Appetizer (the prior catalog puts it in Seafood).
- Some supplied sandwich/siomai photos may have no menu record. They remain
  visible for review but do not create new products.

## Retry/concurrency and partial failure

Uploads use unique object paths with overwrite disabled. The database update
checks ID, original name, approved status and an empty image URL, so an admin's
concurrent photo is not replaced. A known no-op write cleans only this attempt's
unused uploaded object. A failed/uncertain database response retains the object:
deleting it could break a write that actually committed. Check current database
state before retrying; administrator storage review may be needed for orphaned
objects after failures. No old object is removed by the batch importer.

Closing the browser can stop the remaining batch, not undo successful uploads.
Refreshing and rerunning skips already-populated items. The batch requires an
authenticated admin session throughout; do not share cookies/tokens in chat.

Local `test:menu-photos` uses mocked Supabase clients plus real asset decoding,
hash and size checks. It is **not evidence of a hosted Storage upload or database
save**. Actual production completion must be checked after the admin runs it.
