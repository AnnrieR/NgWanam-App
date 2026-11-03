# GCash payment monitoring

Staff and Admin **Payments** pages now query `method = 'gcash'` on the server.
They show all GCash statuses (pending, verified, paid, rejected), newest first.
COD payments are retained in the database, orders and reports; they are not
displayed in this verification queue or its summary counts.

## Controls and actions

- Search order number, customer, sender, GCash number or reference number.
- Filter payment status and recorded date (Philippine time); Clear filters
  returns to all records. Summary counts are all GCash records before filters.
- Ten records per page with Previous/Next; changing filters resets pagination.
- Verify/Reject a pending GCash payment after manually reviewing the restaurant's
  actual transaction. Both require confirmation. Rejection does not cancel the order.
- Mark a verified GCash payment Paid only after the order is Completed.
- Cancelled orders retain their payment history but have no queue actions.
- Refresh fetches current server data. Verification is manual, not a gateway
  integration, reference-number lookup or automatic transfer confirmation.
- Authentication, method checks and the existing transactional payment RPC
  enforce the server-side workflow; terminal statuses cannot be replayed.

## COD collection remains supported

Authorized Staff/Admin use **Record cash collected** in a completed COD order's
details. The dialog requires confirmation that the money was actually collected.
The server rechecks order completion, COD method and Pending payment status
before recording Paid. Customers and riders cannot record payment collection.

No existing payment amounts/statuses are automatically changed. No new migration
is needed for this payment UI update (apply any other pending migrations normally).

## Verification scope

Browser fixtures covered Staff/Admin GCash-only queries and counts, search,
status filtering, pagination/reset, Cancel without mutation, Verify → Paid,
Reject, forged COD rejection by the GCash action, and completed-order COD
collection. Desktop light/dark checks and no-browser-exception checks passed.
Fixture orders/payments were removed; every pre-existing payment and inventory
record matched its pre-test snapshot. Real payment transfers were not tested.
