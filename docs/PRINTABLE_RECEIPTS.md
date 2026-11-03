# Printable order receipts

Open **View / Print receipt** from Customer or Staff/Admin Order Details.
The dedicated `/orders/[orderId]/receipt` page offers **Print / Save as PDF**
using the browser's print dialog. Turn off browser headers/footers for a clean copy.

## Content and access

- Saved order number, customer/contact/address, order type, Philippine-time dates.
- Saved item/serving descriptions, quantities, unit prices and line subtotals.
- Saved subtotal, delivery/pick-up fee and order total. Current catalog prices or
  delivery rates are never substituted; removed menu links do not lose descriptions.
- Actual COD/GCash payment status, independently from order completion.
  Verified is **not** labelled Paid. Pending/rejected/missing payment records do
  not become proof of payment. Cancelled orders have an explicit reference-only notice.
- Current restaurant name/address/contact from settings (not a historical business snapshot).
- This is an order record, **not an official tax invoice**. No fabricated tax,
  invoice number, payment timestamp, refund confirmation or gateway charge is added.

Authentication and role checks are server-side. Customers are restricted to their
own order, with an explicit ownership filter plus existing database RLS. Staff/Admin
can print authorized order records. Riders and unauthenticated users cannot open
receipts. Missing, malformed and other-customer order IDs disclose no order data.

## Printing

The white paper preview remains readable in light/dark mode. Print output omits
navigation, buttons and chatbot, uses A4 margins, repeats table headers and avoids
splitting item rows/totals when possible. Long orders may span several pages.
Printing and downloading do not mutate orders, payments or stock. Refresh the
receipt page to retrieve the latest status before printing another copy.

No database migration is needed for this receipt feature; other pending migrations
should still be applied incrementally. Never reset or reseed as an update step.

## Verified locally

- Desktop browser: customer ownership, Staff/Admin access and detail-page links;
  rider/anonymous denial; malformed/missing/foreign-order handling.
- Paid COD/GCash, verified-but-not-paid, pending and cancelled order states;
  historical removed-menu descriptions, saved fees/totals and Philippine date.
- Print-button invocation, light/dark overflow, print-only visibility and a real
  generated five-page PDF with 65 saved line items. PDF visually inspected for
  repeated headers, intact rows, totals and no chat/navigation controls.
- Exact browser-fixture cleanup preserved all pre-existing orders, order items,
  payments and inventory rows.

Physical printer output, actual-phone printing and official tax-invoice compliance
were not tested or implemented.
