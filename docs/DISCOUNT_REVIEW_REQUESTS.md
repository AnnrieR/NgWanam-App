# PWD / Senior Citizen review requests

Checkout offers No request (default), PWD, or Senior Citizen. Selecting a request
shows a notice and requires acknowledgment that a valid ID will be prepared and
the ID owner will be present at delivery or pick-up. No ID number/photo is collected.

This is **a request for staff review**, not proof of eligibility or approval.
Nothing computes/applies a discount, rewrites totals, reduces the requested GCash
payment, or changes prices, fees, tax, stock reservation or payment processing.
Existing `place_order` database computation and RPC arguments remain unchanged,
except the human-readable notes described below. No migration or historical
backfill is needed. Actual discount policy/settlement must be handled separately
by the restaurant; this feature does not add an adjustment/refund workflow.

The server validates the option and ID acknowledgment. An absent option defaults
to no request for older forms. Requested reviews are prepended to existing staff
notes, and to driver notes for delivery. Original notes remain intact. Customer,
staff, admin and rider order-detail screens show an informational request banner.
Legacy orders without the request marker get no new banner. A note marker is not
an authorization mechanism; a banner never means a discount has been approved.

These are **in-app checkout/order-detail notices**, not email/SMS/push messages.
Staff must open order details to see the review request. Staff and delivery notes
are displayed separately so adding a request does not hide delivery instructions.
The checkout COD icon now uses the Philippine peso symbol.

`npm run test:discount-request` covers real state/action code with mocked services,
including unchanged totals/payloads for delivery/pick-up and COD/GCash. Hosted
ordering/payment and actual-phone behavior still require verification after deploy.
