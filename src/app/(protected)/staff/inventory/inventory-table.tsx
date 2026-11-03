"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Bell, CheckCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { useLiveInventory } from "@/hooks/use-live-inventory";
import { stockStatus, type InventoryRow } from "@/lib/inventory";
import { updateInventory } from "../actions";

export type { InventoryRow } from "@/lib/inventory";
const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function InventoryTable({ rows: initialRows, initialLowOnly = false }: { rows?: InventoryRow[]; initialLowOnly?: boolean }) {
  const { rows, error, loading, checkedAt, refresh } = useLiveInventory(initialRows);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(initialLowOnly);
  const [page, setPage] = useState(1);
  const visible = useMemo(() => rows.filter(row => (!lowOnly || (row.isActive && stockStatus(row) !== "ok"))
    && `${row.item} ${row.category} ${row.variant} ${row.serving}`.toLowerCase().includes(query.trim().toLowerCase())), [lowOnly, query, rows]);
  const alerts = rows.filter(row => row.isActive && stockStatus(row) !== "ok")
    .sort((a,b) => (a.current-a.reserved)-(b.current-b.reserved) || a.item.localeCompare(b.item));
  const outCount = alerts.filter(row => stockStatus(row) === "out").length;
  const lowCount = alerts.length - outCount;
  const pages = Math.max(1, Math.ceil(visible.length / 10));
  const currentPage = Math.min(page, pages);
  const pageRows = visible.slice((currentPage - 1) * 10, currentPage * 10);

  return <div className="space-y-4">
    <div role="status" aria-live="polite" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${error || alerts.length ? "border-amber-500/30 bg-amber-500/5" : "border-green-500/20 bg-green-500/5"}`}>
      <div className="flex items-center gap-2">{alerts.length || error ? <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-amber-600" /> : <CheckCheck aria-hidden="true" className="size-5 shrink-0 text-green-600" />}
        <span>{loading ? "Checking stock…" : error ? "Stock refresh failed; displayed values may be outdated." : <><strong>{lowCount} low-stock</strong> · <strong>{outCount} out-of-stock</strong> active servings</>}</span>
      </div><Button type="button" size="sm" variant="outline" onClick={refresh}><RefreshCw aria-hidden="true" className="size-3.5" />Refresh stock</Button>
      {!loading && alerts.length > 0 && <div className="w-full space-y-3 border-t border-amber-500/20 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium">{error ? "Last loaded alerts" : "Servings needing attention"} · across all inventory pages</p><Button type="button" size="sm" variant="outline" onClick={() => { setLowOnly(true); setQuery(""); setPage(1); }}>Show alerted servings</Button></div>
        <ul aria-label="Servings needing stock attention" className="grid max-h-64 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">{alerts.map(row => <li key={row.id} data-stock-alert-id={row.id} className="min-w-0 rounded-lg border border-amber-500/20 bg-background/60 p-3 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 [overflow-wrap:anywhere]"><p className="font-semibold">{row.item}</p><p className="mt-1 text-muted-foreground">{row.variant} · {row.serving}</p></div><strong className={stockStatus(row) === "out" ? "text-red-600 dark:text-red-400" : "text-amber-800 dark:text-amber-300"}>{stockStatus(row) === "out" ? "Out of stock" : "Low stock"}</strong></div>
          <p className="mt-2 text-muted-foreground">Sellable: <strong className="text-foreground">{row.current-row.reserved}</strong> · Alert threshold: <strong className="text-foreground">{row.minimum}</strong></p>
        </li>)}</ul>
      </div>}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Input aria-label="Search inventory" className="max-w-xs" onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search item, category, or serving" type="search" value={query} />
      <Label className="flex cursor-pointer items-center gap-2 text-xs font-medium"><Input checked={lowOnly} onChange={event => { setLowOnly(event.target.checked); setPage(1); }} type="checkbox" />Active stock alerts only</Label>
      <p className="ml-auto text-xs text-muted-foreground">{visible.length} of {rows.length} servings</p>
    </div>
    <div className="rounded-xl border">
      <Table className="w-full table-fixed text-left text-xs [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere] [&_th]:whitespace-normal">
        <TableHeader className="bg-muted/40"><TableRow><TableHead>Item / Serving</TableHead><TableHead className="w-[12%]">On hand / Reserved</TableHead><TableHead className="w-[12%]">Sellable</TableHead><TableHead className="w-[18%]">Alert status</TableHead><TableHead className="w-[34%]">Adjust stock &amp; threshold</TableHead></TableRow></TableHeader>
        <TableBody>{pageRows.map(row => {
          const status = stockStatus(row);
          return <TableRow key={row.id} data-inventory-id={row.id}>
            <TableCell className="py-4"><p className="font-semibold">{row.item}</p><p className="mt-1 leading-5 text-muted-foreground">{row.category} · {row.variant} · {row.serving}</p><p className="mt-1 text-muted-foreground">{currency.format(row.price)}{!row.isActive && " · Inactive / not approved"}</p></TableCell>
            <TableCell className="py-4"><strong>{row.current}</strong><span className="mt-1 block text-muted-foreground">{row.reserved} reserved</span></TableCell>
            <TableCell className={`py-4 font-bold ${status === "out" ? "text-red-600 dark:text-red-400" : ""}`}>{row.current - row.reserved}</TableCell>
            <TableCell className="py-4"><span className={`inline-flex rounded-md px-2 py-1 font-semibold ${status === "out" ? "bg-red-500/10 text-red-700 dark:text-red-400" : status === "low" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-green-500/10 text-green-700 dark:text-green-400"}`}>{status === "out" ? "Out of stock" : status === "low" ? "Low stock" : "In stock"}</span><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Threshold: {row.minimum}<br />{status === "out" ? "No sellable servings left" : status === "low" ? `Sellable ≤ ${row.minimum}` : `Sellable > ${row.minimum}`}{!row.isActive && " · Dashboard alert muted"}</p></TableCell>
            <TableCell className="py-4"><StockAdjustment row={row} unavailable={error || loading} /></TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>
      {!pageRows.length && <p className="p-8 text-center text-sm text-muted-foreground">{loading ? "Loading inventory…" : error ? "Inventory is unavailable. Retry the stock check." : "No servings match these filters."}</p>}
      <nav aria-label="Inventory pagination" className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground"><span>Showing {visible.length ? (currentPage - 1) * 10 + 1 : 0}–{Math.min(currentPage * 10, visible.length)} of {visible.length}</span><div className="flex items-center gap-3"><Button type="button" size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>Page {currentPage} of {pages}</span><Button type="button" size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></div></nav>
    </div>
    <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground"><Bell aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span>Thresholds are per serving, not a single global number. Example: 25 on hand − 15 reserved = 10 sellable; threshold 10 triggers low stock. Updates arrive live with a 15-second fallback check{checkedAt ? ` · Last checked ${new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Manila" }).format(new Date(checkedAt))} PHT` : ""}. Unsaved edits are retained; if stock changes, use the latest values before saving.</span></p>
  </div>;
}

function StockAdjustment({ row, unavailable }: { row: InventoryRow; unavailable: boolean }) {
  const [draft, setDraft] = useState<{ current: string; minimum: string; updatedAt: string } | null>(null);
  const current = draft?.current ?? String(row.current);
  const minimum = draft?.minimum ?? String(row.minimum);
  const stale = draft !== null && draft.updatedAt !== row.updatedAt;
  function edit(field: "current" | "minimum", value: string) {
    setDraft(previous => ({ current: previous?.current ?? String(row.current), minimum: previous?.minimum ?? String(row.minimum), updatedAt: previous?.updatedAt ?? row.updatedAt, [field]: value }));
  }
  return <Form action={updateInventory}>
    <input name="inventoryId" type="hidden" value={row.id} /><input name="expectedUpdatedAt" type="hidden" value={draft?.updatedAt ?? row.updatedAt} />
    <div className="grid grid-cols-2 gap-2">
      <Label className="grid min-w-0 gap-1 text-[10px]">On hand<Input aria-label={`On-hand stock for ${row.item} ${row.variant}`} className="h-8 w-full min-w-0 text-xs" value={current} onChange={event => edit("current", event.target.value)} min={row.reserved} step="1" name="currentStock" required type="number" /></Label>
      <Label className="grid min-w-0 gap-1 text-[10px]">Alert threshold<Input aria-label={`Alert threshold for ${row.item} ${row.variant}`} className="h-8 w-full min-w-0 text-xs" value={minimum} onChange={event => edit("minimum", event.target.value)} min="0" step="1" name="minimumStock" required type="number" /></Label>
    </div>
    {stale && <p role="status" className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">Stock changed. Review the latest values before saving.</p>}
    <div className="mt-2 flex flex-wrap items-center gap-2"><SaveStock disabled={unavailable || stale} />{draft && <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setDraft(null)}>{stale ? "Use latest" : "Reset"}</Button>}</div>
  </Form>;
}

function SaveStock({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <Button className="h-8 px-3 text-xs" size="sm" type="submit" disabled={disabled || pending}>{pending ? "Saving…" : "Save"}</Button>;
}
