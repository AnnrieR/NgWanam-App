# Reports charts

Admin → Reports (`/admin/reports`) retains the summary cards and adds:

- Seven daily **order-count** bars, ending today in Philippine time. Counts each
  order once by `created_at`, including cancelled orders, delivery/pick-up and
  both payment methods. This replaces the former completed-sales graph; it does
  not show currency, sold quantities or completion-date counts.
- The **Completed sales today summary card remains**. It uses completed orders'
  actual `completed_at`, includes COD/GCash and saved delivery fees. It is completed
  order value, not proof of payment collection. Missing completion timestamps
  are excluded, not backfilled. No financial records are removed by this UI change.
- Today's placement-based status donut. Ready includes deliveries awaiting
  staff completion. Cancelled orders remain part of the placement count.
- All-time top six best sellers, by completed-order serving quantities and saved
  item names. Ties sort by name; cancelled/unfinished orders are excluded.

Zero data is labelled explicitly. Visible labels and exact values accompany
the graphs; meaning never depends on colour or hover alone. Charts are
server-rendered CSS/SVG with no new chart dependency or external service.

Failed queries or API-truncated datasets show a report-unavailable message,
never apparently complete partial totals. The existing API row limit remains a
scaling boundary; use paginated retrieval/database aggregation if it is reached.

Refresh the page to load current data. No migration, reseed, historical update
or stock adjustment is required.

Verification: lint and TypeScript; read-only desktop browser comparisons against
SQL for daily order counts, all six statuses and best sellers; light/dark layout at
1440, 1024 and 800 CSS pixels. Actual-phone testing remains deferred.
