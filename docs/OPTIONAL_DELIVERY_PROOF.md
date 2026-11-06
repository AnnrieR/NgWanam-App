# Optional proof-of-delivery photo

Deploy the web update **and** apply only
`supabase/migrations/20261106020000_optional_delivery_proof.sql` to the existing
database through the approved administrator SQL connection. The previous database
function requires an image, so a web-only deployment cannot enable photo-free
delivery confirmation. Do not reset/reseed or blindly apply unreconciled migration
history. The function replacement retains its current grants.

The dialog allows **Confirm delivered** without a photo. The server sends a null
proof path and does not access Storage in that case. If a photo is supplied, the
existing signature/MIME and strictly-below-1-MiB checks still apply; invalid,
multiple or failed uploads block the attempt instead of silently ignoring it.
The database still verifies any supplied object's bucket, rider and delivery path.

Only active, assigned riders can advance `assigned → out_for_delivery → delivered`
on ready delivery orders. The function retains order → delivery → inventory locks
and calls the **same** `private.deduct_order_stock_once` function with or without a
photo. Staff completion does not deduct again. Cancellation, pick-up, reservations,
prices, payments and all historical rows/photos remain unchanged.

For deployment verification, confirm one intended delivery without an image and
one with a valid optional image. Check stock/reservations once, staff completion,
repeat-submit rejection and the absence/presence of the signed proof link. Do not
replay or modify historical deliveries. A missing proof link is normal for a
delivery confirmed without a photo.
