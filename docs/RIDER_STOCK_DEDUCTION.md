# Stock deduction at Rider Delivered

Owner-approved lifecycle change, applied incrementally by
`20261020030000_deduct_stock_at_rider_delivered.sql`:

| Event | Inventory effect |
| --- | --- |
| Place Order | Reserve servings; on-hand unchanged |
| Cancel before Delivered | Release reservation; on-hand unchanged |
| Rider Start delivery | None |
| Rider Confirm delivered with proof | Deduct on-hand and release reservation once |
| Staff Complete delivered order | Finalize order/completion time; no second deduction |
| Staff Complete pick-up order | Deduct on-hand and release reservation once |

This does **not** automatically mark the order Completed or Paid. Staff still
finalizes orders and records payment using the established COD/manual-GCash flow.
Rider Delivered still requires the assigned active rider, Ready delivery order,
Out for Delivery state and a proof photo. The strict below-1-MB upload checks and
storage policies are unchanged.

## Atomicity and replay safety

The rider RPC locks order, delivery and inventory in a consistent order. Proof,
stock checks, movements, stock marker and Delivered state are one transaction.
Missing proof or insufficient reservations cannot leave a half-delivered order.
The server action cleans a newly uploaded proof if the RPC fails.

`orders.stock_deducted_at` is an internal once-only marker. The private deduction
helper cannot be invoked directly by authenticated/anonymous clients. Completion
movements retain `movement_type='completion'`; `performed_by` identifies the rider
for delivery consumption and staff for pick-up consumption. Repeated state changes
are rejected, and Staff Completed does not create another stock movement.

Delivered orders cannot be cancelled to release stock a second time. Returns,
refunds and restocking require a separate approved process; no automatic restock
or refund feature is added. Before-delivery cancellations keep their existing rules.

## Existing data

The migration does not change any historical stock amounts, movements or order
statuses. Existing completed orders retain their original stock history; their
new marker may be null because it is not backfilled.

If another installation has a legacy Delivered-but-not-Completed order with its
reservation still outstanding, staff completion safely performs its original
once-only deduction. This prevents silently consuming old orders during migration
or losing their deduction later. Inconsistent pre-existing completion movements
are rejected for review rather than guessed or deducted twice.

Reservation integrity queries must exclude orders with `stock_deducted_at` set,
even while they remain Ready/awaiting staff completion. The current integrity test
and local testing guide use this condition. Do not rerun historical repair/seed SQL.

## Student update after publication

```powershell
git pull --ff-only origin main
npm ci
npx supabase migration up --local
npm run dev
```

Use the correct project root. No reset/reseed/repair is needed. Other pending
migrations must also be applied normally, in order.

## Verification

`supabase/tests/rider_stock_deduction.sql` runs rollback-only fixture workflows:
reservation, start delivery, missing proof, insufficient-reservation rollback,
proof-bearing Delivered deduction, rider audit, replay denial, no double deduction
at Staff Completed, post-delivery cancellation denial, pre-delivery cancellation,
pick-up, legacy outstanding delivery and helper/anonymous access restrictions.

Desktop browser regression also used an actual Rider Start delivery, real proof
photo upload/Confirm delivered, then Staff Complete and reload. Stock moved from
20 on-hand / 2 reserved to 18 / 0 at Rider Delivered and remained 18 / 0 at Staff
Completed, with one rider-attributed completion movement. The proof link remained
available to authorized staff. All fixture records and the uploaded proof were
removed; pre-existing orders/items/payments/inventory/notifications/storage matched
their before-test snapshots. No actual-phone test was performed.
