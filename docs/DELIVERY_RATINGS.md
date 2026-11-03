# Delivery monitoring and rider ratings

## Delivery operations

Staff and Admin share the delivery screen, including:
- Awaiting Rider / Assigned / Out for Delivery / Delivered summary counts.
- Whole-list search (order, customer, phone, address, rider), status filter,
  ten-row pagination and manual Refresh. Filter changes return to page one.
- Cancelled orders excluded by default; Include cancelled orders reveals history.
  Summary counts always exclude cancelled orders and are not filter-dependent.
- Ready delivery orders without a delivery record can be assigned to active riders.
  Existing guarded assignment RPC still enforces eligibility and duplicate protection.
- Rider average/count, address/contact information and Philippine-time milestones.

Only riders change delivery status and upload proof photos. Existing proof-photo
requirements and strict below-1-MB limit are unchanged. Staff/Admin do not gain
rider status controls. Delivery stock now deducts on **Rider Delivered** with proof;
pick-up still deducts on **Staff Completed**. See `RIDER_STOCK_DEDUCTION.md`.

## Customer feedback

Customers can rate their own successfully delivered order from Order Details:
- 1–5 whole-number stars, optional comment up to 500 characters.
- Available when delivery is Delivered and order is Ready or Completed.
- Cancelled, unfinished and pick-up orders cannot be rated.
- Exactly one immutable rating per delivery. Saved feedback remains visible.
- Rider identity comes from the delivery record, not client-submitted fields.

Staff/Admin see rider averages/counts in monitoring and assignment options.
Riders see only their own summary in Assigned Deliveries. No public leaderboard
or global customer/profile access is added. Raw feedback is readable only by
its customer, its rider and authorized Staff/Admin; writes require the checked RPC.

## Updating an existing local installation

After these changes are published, from the correct project directory:

```powershell
git pull --ff-only origin main
npm ci
npx supabase migration up --local
npm run dev
```

Migration `20261019020000_delivery_rider_ratings.sql` adds ratings, RLS and guarded
RPCs. It does not reset/reseed or change existing orders, payments, deliveries or
inventory. Do not use `db reset` or rerun the seed as an updater.

## Verification

- `supabase/tests/delivery_ratings.sql`: rollback-only eligibility, ownership,
  role/anon guards, stars/comment validation, duplicate protection, direct-write
  denial, customer context, rider summary and read access checks.
- Desktop browser fixtures: Staff/Admin search/status/pagination, assignment,
  cancelled exclusion, light/dark overflow; customer submission and reload;
  unavailable rating for unfinished/cancelled deliveries; actual rider summaries.
- Fixtures removed; all pre-existing orders, deliveries, payments, ratings and
  inventory matched their pre-test snapshots.
- Actual-phone testing and real delivery/photo upload were not repeated in this batch.
