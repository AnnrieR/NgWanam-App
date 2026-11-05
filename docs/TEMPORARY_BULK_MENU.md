# Temporary Bulk Add — Photos 1–15

The owner supplied fifteen January/May 2026 menu pages and authorized **15 initial sellable
servings per newly created serving**, not per individual lumpia piece. The encoded
catalog contains **142 item/lahok identities and 211 serving/price entries** after
combining the same noodle/lahok's regular and family sizes. Corkage fees are not
orderable inventory and are excluded. No image files are uploaded or fabricated.

## Deploy and use

Commit/push and redeploy the existing web service. No new SQL migration or reseed
is needed for this batch. The server's existing service-role configuration is
required, never sent to the browser. Menu → Add menu → **Bulk Add** is admin-only;
normal staff/manual Add/Edit/Delete remain unchanged. The earlier `/menu/import`
URL redirects to `/menu/bulk-add`.

The read-only preview compares **item + lahok + serving** (including piece counts).
If Good for 8 exists but Good for 12 does not, only Good for 12 is added. Existing
prices, stock balances/reservations, images, categories, approval states and IDs
are never overwritten. Existing inactive/retired servings count as existing and
are not recreated/reactivated. Inactive/unapproved items aren't silently extended.

Photos 6–10 contribute 35 listed products / 36 serving-price entries. Nine products
are additional family sizes of existing recipes (rice, chopsuey, pasta and lumpia
gulay), so their sizes are appended without changing previous serving indexes/IDs.
Batch 1 remains 95 identities / 135 entries; batch 2 added 26 new identities and
36 new sizes (121/171 cumulative). Re-running Bulk Add must not reset old balances.

Photos 11–15 add 31 listed products / 40 serving-price entries: 12 Salo-Salo Tray
products (21 sizes) and SM1–SM8 / PM1–PM5 / RM1–RM6 (19 bento products). Ten tray
recipes append sizes to earlier items, so this batch adds 21 new identities for
142/211 cumulative. SM/PM/RM contents are descriptions, never separate products,
and use **Bento Meal** with no guessed Good for count. Fried Siomai is included only
as an SM1 component, not a standalone item. New available-anytime trays are not
pre-order; conflicting existing pre-order settings require review, not an override.

Fried Chicken w/ Vegetables (Large, Good for 12–15, 1600) remains distinct from
HongKong Style because the owner has not confirmed they are the same recipe. Do
not merge them, rewrite references or replace descriptions based on assumption.

Birthday Meal uses **Set**, Party Box uses **Box**, and Breaded Pork uses **Party
Tray** with no guessed person count. These remain normal active menu offerings
after setup, subject to stock and existing order rules. Photos 8–10 explicitly
set `requires_preorder=true` for newly created party-tray items. Existing item
pre-order settings are not rewritten; a conflict blocks adding missing servings.
Bundle contents are stored in new-item descriptions. Per-kilo shrimp and 3-kilo
pork are weight-based sellable servings, not counts of guests or raw-piece stock.

Choose categories for selected **new items** only; existing items keep theirs.
Missing categories can be added through the normal Add category UI. Review similar
names before selecting them. Multiple ambiguous item matches or unknown serving
labels such as an unexplained “Regular” block automatic writes rather than guessing
that it means Good for 2. Distinct pork and chicken lahok are never merged.

One confirmed click runs sequential requests of at most five items to avoid a long
single deployment/proxy timeout. Keep the page open. A failure stops later batches;
earlier successes stay saved. Refresh and retry. Fixed IDs and conflict-ignore
inserts preserve existing stocks; new-item setup stays inactive until complete.
Only known importer-created, unchanged servings with a missing stock row can resume
stock initialization. Changed incomplete entries require manual review.

Fingerprints include serving edits and inventory-row existence, not changing stock
balances. This protects stale previews without treating an ordinary order as a
reason to reset stock. Database uniqueness guards and repeated reads reduce races;
this is not a single transaction across all items. Avoid manual menu edits while a
bulk operation runs. Never reset/reseed or rewrite transactions to repair an error.

## Verification and removal

`npm run test:menu-import` covers the encoded catalog and mocked item/serving/stock
operations, including Good for 8/12 matching, different preserved prices, pork vs
chicken separation, inactive servings, partial failures, parallel identical imports,
stale serving edits, unknown serving labels, admin/consent gates and request limits.
These tests do not prove hosted/browser import success and make no live writes.

After deployment, confirm actual saved serving/price rows and stock in the live
admin UI. Complete later photo batches before removing this temporary code. Once
the owner confirms all menu data is present, remove the Bulk Add link/routes/action/
catalog/helper/tests as a separate change. Keep normal CRUD and all database rows;
removing this UI must not undo imported data.
