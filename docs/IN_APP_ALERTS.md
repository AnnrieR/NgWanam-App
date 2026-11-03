# In-app order and delivery alerts

The Customer, Staff, Admin and Rider workspace headers now include a notification
bell. Alerts belong to individual accounts; one user's read actions never mark
another user's copy as read.

## Event recipients

| Event | Recipients |
| --- | --- |
| New order | All currently active Staff/Admin |
| Order status changes | That order's active Customer |
| Rider assignment | That order's active Customer and assigned active Rider |
| Out for delivery | That order's active Customer |
| Delivered | That order's active Customer and all active Staff/Admin |
| Assigned order cancelled | Its Customer and assigned active Rider (do not deliver warning) |

Delivered alerts explicitly say the order still awaits restaurant completion.
Delivery stock deducts on **Rider Delivered** with proof; pick-up deducts at
**Staff Completed**. See `RIDER_STOCK_DEDUCTION.md`. Alerts themselves do not
change stock, payment, proof or order status.

## Display and refresh

- Bell shows unread count (99+ visually above 99); full count appears in the panel.
- Panel lists the latest 50 alerts, newest first, with Philippine-time timestamps.
- Opening the panel or following a link does **not** automatically mark it read.
- Mark as read changes that alert; Mark all as read changes all unread alerts
  belonging to the current account/role, including older alerts beyond the 50 shown.
- Customer/Staff/Admin alerts link to Order Details; Rider alerts link to Deliveries.
- Realtime triggers a refresh; 15-second visible-tab polling and window/tab-focus
  refresh are fallbacks. Manual Refresh alerts is also available.
- Refresh failures preserve last loaded rows/count with a warning. No false empty
  state is substituted for a failed refresh. Account changes clear loaded data.

These are **in-app only**: no SMS/email, browser push, sound, payment gateway or
background operating-system notification. The app must be open to see fresh alerts.
The panel is a recent-alert list, not a full searchable notification archive.

## Database and access

`20261020010000_in_app_order_delivery_alerts.sql` creates the notification table,
recipient-and-role RLS, checked mark-read RPC, event triggers and Realtime publication.
Only forward events generate alerts; existing orders are **not** backfilled. Alerts
persist across reloads, and are removed if their order is deleted. Messages contain
order numbers/status only, not delivery addresses, phone numbers or payment details.

Authenticated clients cannot directly insert/update/delete alerts. Mark-read checks
the active authenticated recipient and current role. Even Admin can read only their
own alert copies. Inactive accounts and anonymous callers have no access. Current
role must match the alert's recipient role; changing roles does not reveal the old
role's alerts. The existing order RLS still guards linked Order Details.

## Safe student update (after publication)

Run in the correct project root:

```powershell
git pull --ff-only origin main
npm ci
npx supabase migration up --local
npm run dev
```

No reset, reseeding or migration repair is needed. Applying this migration does
not modify historical order/payment/delivery/inventory records or generate alerts
for them. Current work must be published before another installation can pull it.

## Verification

- `supabase/tests/notifications.sql` uses rollback-only fixtures to check event
  recipients, unchanged-status duplicate prevention, Realtime publication,
  recipient RLS, single/all read, foreign-ID isolation, inactive-account denial,
  direct-write denial and anonymous RPC denial.
- Desktop browser fixtures checked all four roles, live unread arrivals, manual
  read semantics and persisted database read state, role-specific links,
  light/dark overflow, realtime-transport-blocked refresh, failed-refresh data
  retention and recovery.
- Browser fixtures were removed. Every pre-existing order, delivery, payment,
  inventory row and notification matched its before-test snapshot.
- Actual-phone testing and external notifications are not part of this batch.
