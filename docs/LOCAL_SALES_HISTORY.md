# Optional local sample sales history

These are **synthetic test records, not genuine restaurant sales**. Normal order
names have no DEMO prefix, as requested. Provenance and exact cleanup snapshots
are retained in `private.local_sales_fixture_orders`, inaccessible to app roles.
Do not represent this local report as actual business revenue or collection.

## Explicit one-time commands

Run from `D:\Web Projects\ngwanam`, with the existing Docker database running:

```powershell
node scripts/local-sales-history.mjs check
node scripts/local-sales-history.mjs add
```

The runner targets only Docker container `supabase_db_ng_wanam`; it does not
read cloud credentials, expose an API or modify migrations/default seeds. It is
never called by `npm run dev`, startup or a daily task.

- Adds 28 completed, paid pick-up orders across the seven Philippine calendar
  dates **before** the first run. Today's manual workflow remains untouched.
- Uses eight existing approved menu items, current price snapshots, varied
  quantities and daily counts (3 / 5 / 2 / 6 / 4 / 5 / 3), with COD and GCash.
- Pick-up means zero delivery fee and no invented rider activity, ratings,
  proof photos or addresses. No new accounts or real contact details are added.
- Contact is `Walk-in customer`; missing phone information is `Not recorded`.
  GCash references start `LOCAL-HISTORY-`; no actual transfer or verification
  by a real staff member is claimed.
- Past placement, completion and payment timestamps agree. Today's 7-day chart
  displays the six overlapping historical dates plus today's actual sales.
- Existing orders/items/payments, stock, reservations, ledger, deliveries,
  notifications and activity logs are checked for preservation in-transaction.
  No deduction/reservation RPC runs; stock is not backfilled and the stock
  deduction marker stays null, as for historical completed orders.
- Trigger alerts/log entries for newly inserted fixture UUIDs are removed in
  the same transaction, so no past-order alerts appear as new work.
- An existing intact batch is a no-op: it never shifts dates or adds duplicates.
  Refresh Reports to see the updated graphs; data is not regenerated tomorrow.

## Exact cleanup

```powershell
node scripts/local-sales-history.mjs cleanup
```

Deletes only unchanged orders whose exact UUIDs and full order/item/payment
snapshots match the private manifest. Items and payments cascade for those
orders only. If a fixture has been edited or acquired operational activity,
cleanup aborts the entire transaction for manual review. Never use broad
customer/name/date filters or delete inventory history to force cleanup.

`check` exercises add, duplicate-add, cleanup, repeated-cleanup and re-add in
one rolled-back transaction. Like any PostgreSQL insert test, it can leave gaps
in the order-number sequence; it never rewinds that sequence or edits existing
order numbers. No reset/reseed is required.
