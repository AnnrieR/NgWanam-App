# Inventory alerts — local demo

## Alert rules

- **Sellable = on-hand − reserved.** Units are servings of a menu variant.
- **Out of stock:** sellable ≤ 0.
- **Low stock:** sellable > 0 and sellable ≤ that serving's alert threshold.
- Example: 25 on hand − 15 reserved = 10 sellable. Threshold 10 triggers a
  low-stock alert; 11 sellable does not. Threshold 0 alerts only at zero.
- Each serving has its own configurable threshold. Existing thresholds are
  retained; this update does not change every serving to 10.
- Dashboard alerts and the inventory **Active stock alerts only** filter include
  only active variants of active, approved menu items. Inactive/unapproved
  entries remain editable in the unfiltered inventory list.

## Screens and updates

Staff and Admin dashboards show **Live Stock Alerts**, unaffected by the
dashboard's historical date selection. The panel shows four urgent servings
(lowest sellable first); **Review inventory** opens the full filtered list.

Inventory has explicitly labelled **On hand** and **Alert threshold** fields,
10-row pagination, search, and a manual **Refresh stock** button. Supabase
Realtime inventory changes trigger refreshes; a 15-second polling fallback and
focus/visibility checks also fetch the latest data. Background tabs pause checks.
Network failures show a warning, not a false healthy-stock message.

These are **in-app** alerts, not email, SMS or OS push notifications.

## Saving safely

Unsaved fields survive incoming stock updates. If an inventory row changes
while editing, Save is disabled; **Use latest** discards only that row's draft
and loads its current stock/threshold. A timestamp-checked, row-locking RPC
also rejects stale requests on the server. Staff/Admin authorization,
non-negative whole-number validation, and on-hand ≥ reserved still apply.
Saving a threshold alone does not change on-hand or reserved quantities.

**Current stock lifecycle:** reserve at Place Order; release on pre-delivery
cancellation. Delivery stock deducts at **Rider Delivered** with proof; pick-up
stock deducts at **Staff Completed**. Staff completion never deducts a delivered
order twice. See `RIDER_STOCK_DEDUCTION.md` for the incremental lifecycle change.

## Student update

After pulling the code and installing dependencies, run:

```powershell
npx supabase migration up --local
```

Migration `20261019010000_inventory_alerts_and_safe_adjustments.sql` enables
inventory Realtime and adds the checked adjustment RPC. It does not reset,
reseed or modify existing stock/order records. Do not run `db reset`.

## Verification

- `supabase/tests/inventory_alerts.sql`: rollback-only checks for staff/admin
  saves, threshold-only preservation, stale/negative/below-reservation denial,
  and customer/anonymous denial.
- Browser fixture checks: dashboard updates at the threshold and zero,
  replenishment removes alerts, Staff/Admin UI saves, stale drafts retained and
  blocked, desktop light/dark layout, and 10-row pagination.
- Fixtures cleaned; pre-existing inventory rows and order count unchanged.
- Existing migration integrity tests confirm reservations remain consistent.
