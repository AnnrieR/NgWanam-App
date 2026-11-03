"use client";

import Link from "next/link";
import { Bell, CheckCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveInventory } from "@/hooks/use-live-inventory";
import { stockStatus } from "@/lib/inventory";

export function StockAlerts({ inventoryHref }: { inventoryHref: string }) {
  const { rows, loading, error, checkedAt, refresh } = useLiveInventory();
  const alerts = rows.filter(row => row.isActive && stockStatus(row) !== "ok")
    .sort((a, b) => a.current - a.reserved - (b.current - b.reserved) || a.item.localeCompare(b.item));
  const out = alerts.filter(row => stockStatus(row) === "out").length;
  return <section aria-labelledby="stock-alerts-title" className="rounded-2xl border bg-background p-5 shadow-sm lg:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="stock-alerts-title" className="flex items-center gap-2 font-semibold"><Bell aria-hidden="true" className="size-5 text-orange-600 dark:text-orange-400" />Live Stock Alerts</h2><p className="mt-1 text-xs text-muted-foreground">Current inventory · independent of the dashboard date</p></div>
      <div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={refresh}><RefreshCw aria-hidden="true" className="size-3.5" />Refresh stock</Button><Button size="sm" variant="outline" render={<Link href={`${inventoryHref}?low=1`} />}>Review inventory</Button></div>
    </div>
    <div role="status" aria-live="polite" className="mt-4">
      {loading ? <p className="text-sm text-muted-foreground">Checking stock levels…</p> : error ? <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">Live stock check failed. {checkedAt ? "Showing the last successful stock check; it may be outdated." : "Stock availability is not confirmed."} Use Refresh stock to try again.</p> : alerts.length ? <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-sm font-medium text-amber-800 dark:text-amber-300"><TriangleAlert aria-hidden="true" className="size-4 shrink-0" />{alerts.length - out} low-stock · {out} out-of-stock servings need attention.</p> : <p className="flex items-center gap-2 rounded-xl bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-300"><CheckCheck aria-hidden="true" className="size-4" />All active servings are above their low-stock thresholds.</p>}
    </div>
    {!loading && alerts.length > 0 && <ul className="mt-3 grid gap-3 lg:grid-cols-2">{alerts.slice(0, 4).map(row => <li key={row.id} className="rounded-xl border p-3 text-xs"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{row.item}</p><p className="mt-1 text-muted-foreground">{row.variant} · {row.serving}</p></div><span className={stockStatus(row) === "out" ? "shrink-0 font-semibold text-red-600 dark:text-red-400" : "shrink-0 font-semibold text-amber-700 dark:text-amber-400"}>{stockStatus(row) === "out" ? "Out of stock" : "Low stock"}</span></div><p className="mt-3 text-muted-foreground">Sellable: <strong className="text-foreground">{row.current - row.reserved}</strong> · Alert threshold: <strong className="text-foreground">{row.minimum}</strong></p></li>)}</ul>}
    {alerts.length > 4 && <p className="mt-3 text-xs text-muted-foreground">Showing 4 of {alerts.length} alerts. Review inventory for the full list.</p>}
    <p className="mt-4 border-t pt-3 text-[11px] leading-5 text-muted-foreground">Low stock: sellable ≤ threshold; out of stock: sellable ≤ 0. Sellable = on hand − reserved. Only active, approved menu servings trigger dashboard alerts. Live updates with a 15-second fallback check{checkedAt ? ` · Last checked ${new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila" }).format(new Date(checkedAt))} PHT` : ""}.</p>
  </section>;
}
