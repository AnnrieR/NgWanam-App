# Area-based delivery fees

Checkout now requires a searchable, approved delivery area for Delivery orders.
The complete address remains a separate required field. Pick-up requires neither
an area nor an address and still has zero delivery fee.

## Source and confirmed corrections

Source: the two supplied **Ng-Wanam Delivery Charge Guide vJanuary2026** photos.
The owner confirmed these conflicts in the conversation:

| Area | Applied fee |
| --- | --- |
| Camella Solomiente | PHP 150 |
| Greenwoods Phase 1 / generic Greenwoods Subd. | PHP 150 |
| Nangkaan, San Pascual | PHP 150 |
| Mahabang Dahilig | PHP 250 |

Greenwoods Phase 4 - Wide remains **PHP 200**, as separately printed in the guide;
the Phase 1 conflict correction was not extrapolated to other phases.

Owner-confirmed name correction: **Bauan / Aplaya — PHP 150** (removed the
incorrect "Biayan"). Applied through
`supabase/migrations/20261020040000_correct_bauan_delivery_area_name.sql`;
the area ID, fee and existing order snapshots remain unchanged.

The migration contains 149 active destinations:

| Fee | Destinations |
| --- | ---: |
| PHP 70 | 19 |
| PHP 100 | 36 |
| PHP 120 | 15 |
| PHP 150 | 20 |
| PHP 180 | 15 |
| PHP 200 | 23 |
| PHP 250 | 21 |

The exact rate list is in
`supabase/migrations/20261020020000_area_based_delivery_fees.sql`.
Repeated identical entries (D. Silang, Pallocan East, Sta. Rita Aplaya) are merged.
Combined Barangay 2 + 3 and Banaba Center/West/East entries are selectable
individually at their shared printed rate. Clear handwritten Barangays 4, 5, 7,
9 and 10 are included at PHP 100. Distinct locations such as Hinch Ville in
San Pascual versus Sta. Rita retain their distinct guide rates.

### Not activated pending exact spelling/location confirmation

- The red subdivision-name row under PHP 120.
- The PHP 250 San Pascual / Laylayan row, whose exact area name is unclear.
- Other unconfirmed handwritten additions: the extra PHP 120 Mendoza Road entry
  without its precise locality (the printed Sta. Rita entry is available), the
  PHP 200 handwritten additions, and the handwritten PHP 250 additions at the bottom.

No guessed aliases, prices, distances or minimum-order requirements are added.
Only explicit selections determine fees: broad Balagtas does not automatically
select a subdivision, Sitio 7, or another differently priced destination.

## Customer behavior

- Cart displays items subtotal and **Calculated at checkout** for delivery,
  rather than the obsolete flat-fee estimate.
- The area-picker dialog supports barangay, subdivision, road and landmark
  search; BRGY/Barangay and Santa/Sta search spellings are recognized.
- Choosing an area updates the delivery fee and total before Place Order.
- An unlisted/free-typed search cannot become a submitted area. Contact the
  restaurant or use pick-up instead; do not choose a nearby area as a substitute.
- No Maps API, distance pricing, geocoding or automatic address verification.
  Customers must choose the correct area for their complete address; staff can
  inspect it in the saved order. The app cannot prove geographic address matching.

## Server and data safety

`delivery_areas` stores approved names/rates. Active authenticated accounts can
read active areas, but cannot directly edit rates. No rate-editing UI is added:
changes need restaurant approval, matching the source guide's warning.

The guarded `place_order` RPC looks up and share-locks the selected active area.
It compares the displayed quote with the current rate, but **charges only the
database rate**. Missing/forged/inactive areas and missing/stale/tampered quotes
are rejected before creating an order or reserving stock. A stale checkout must
be refreshed and its total reviewed, especially before a manual GCash transfer.
There is only one public ordering RPC signature; old delivery calls lacking an
area cannot fall back to the flat fee. Legacy pick-up calls still work.

The new order snapshots its area name, area ID, fee and full total. Its delivery
address includes the selected name plus entered address details so existing
Staff/Admin/Rider screens and printable receipts receive the area information.
Later catalog rate/name changes do not rewrite these saved amounts or labels.

The old `restaurant_settings.delivery_fee` is retained for compatibility/history
but is **not used** for new checkout pricing, cart estimates or the chatbot's
delivery-fee answer. Existing order fees/totals and payment amounts are untouched.

Role restrictions, active/approved menu checks, COD/manual GCash, atomic stock
reservation/release remain intact. Delivery stock now deducts at Rider Delivered
with proof; pick-up at Staff Completed (see `RIDER_STOCK_DEDUCTION.md`). No new
automatic notification, payment gateway or external service is involved.

## Safe update after publication

From the correct project root:

```powershell
git pull --ff-only origin main
npm ci
npx supabase migration up --local
npm run dev
```

No reset, reseeding or migration repair. The incremental migration adds the
approved area catalog, nullable order snapshot columns and revised RPC/chatbot;
it does not reprice or relabel old orders. Current local work must be published
before student installations can pull it.

## Verification

- `supabase/tests/delivery_fees.sql`: rollback-only checks for all seven tiers,
  confirmed corrections, payment/order agreement, area/address snapshots, pickup,
  missing/forged/inactive/stale/underquoted rejection, no alternate RPC bypass,
  staff/anonymous/direct-rate-write denial and unchanged reservation/release.
- Desktop browser: search/no-match/BRGY alias; required-area blocking; all seven
  preview tiers and four confirmed corrections; light/dark overflow; actual
  checkout action rejecting a forged fee; COD Camella 150 and manual GCash
  Mahabang Dahilig 250; receipt address/total; zero-fee pick-up without area/address.
- Browser fixture records and their inventory movements/alerts were cleaned.
  Every pre-existing order, order item, payment, inventory row, notification and
  area rate matched its before-test snapshot. No real GCash transfer was made.
- Actual-phone testing and map-based address verification are not included.
