"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BarChart3, CheckCheck, ChevronRight, ClipboardList, Clock3, CookingPot, Package, RefreshCw, TrendingUp } from "lucide-react";

import { Label } from "@/components/ui/label";
import { FormSelect, SelectOption } from "@/components/ui/form-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { manilaDate, operationLabel } from "@/lib/operations";
import { StockAlerts } from "@/components/stock-alerts";

export type OperationOrder = {
  id: string; orderNumber: string | number; customer: string | null; phone?: string | null;
  createdAt: string; status: string; payment: string | null; items: string;
  orderType?: string | null; deliveryStatus?: string | null; completedAt?: string | null;
  deliveredAt?: string | null; extraActions?: ReactNode;
  categories?: { name: string; quantity: number }[];
};

const stages = [
  { status: "pending", label: "Pending", color: "#d97706" },
  { status: "confirmed", label: "Confirmed", color: "#2563eb" },
  { status: "preparing", label: "Preparing", color: "#ea580c" },
  { status: "ready", label: "Ready / delivery", color: "#9333ea" },
  { status: "completed", label: "Completed", color: "#16a34a" },
  { status: "cancelled", label: "Cancelled", color: "#dc2626" },
];
const clock = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const panelClass = "rounded-2xl border bg-background shadow-sm";

export function OperationsDashboard({ orders, today, failed = false, inventoryHref = "/staff/inventory" }: { orders: OperationOrder[]; today: string; failed?: boolean; inventoryHref?: string }) {
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const daily = orders.filter(order => manilaDate(order.createdAt) === date);
  const completed = orders.filter(order => order.status === "completed" && order.completedAt && manilaDate(order.completedAt) === date).length;
  const inProgress = daily.filter(order => ["pending", "confirmed", "preparing", "ready"].includes(order.status)).length;
  const filtered = daily.filter(order => (status === "all" || order.status === status) && `${order.orderNumber} ${order.customer} ${order.items}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  const breakdown = stages.map(stage => ({ ...stage, count: daily.filter(order => order.status === stage.status).length }));
  const categories = new Map<string, number>();
  for (const order of daily) {
    if (order.status === "cancelled") continue;
    for (const item of order.categories ?? []) categories.set(item.name, (categories.get(item.name) ?? 0) + item.quantity);
  }
  const topCategories = [...categories].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  const maxCategory = Math.max(1, ...topCategories.map(([, quantity]) => quantity));

  return <div className="space-y-6">
    <header className="relative overflow-hidden rounded-3xl bg-[linear-gradient(115deg,#a71c04,#400d0a)] p-6 text-white lg:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-12 size-64 rounded-full border-[32px] border-[#ffc42f]/10" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#ffc42f] uppercase">Ng Wanam · Daily operations</p>
          <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/80">Your orders at a glance. Plan the kitchen, follow progress, and see what&apos;s popular.</p>
        </div>
        <Label className="grid gap-2 rounded-xl border border-white/20 bg-black/10 p-3 text-xs font-semibold">
          <span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="size-4 text-[#ffc42f]" />Dashboard date · Philippine time</span>
          <Input aria-label="Dashboard date" type="date" value={date} className="bg-background text-foreground" onChange={event => { setDate(event.target.value); setPage(1); }} />
        </Label>
      </div>
    </header>

    <StockAlerts inventoryHref={inventoryHref} />

    {failed ? <section role="alert" className={`${panelClass} p-8 text-center`}>
      <h2 className="text-lg font-semibold">Dashboard data could not be loaded</h2>
      <p className="mt-2 text-sm text-muted-foreground">Check the local database connection, then try again. Incomplete totals are not displayed.</p>
      <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}><RefreshCw className="size-4" />Try again</Button>
    </section> : <>
      <section aria-label="Order summary" className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Orders", value: daily.length, detail: "Placed on selected date · includes cancelled", icon: ClipboardList, color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
          { label: "Orders In Progress", value: inProgress, detail: "Placed on selected date · not yet completed", icon: CookingPot, color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
          { label: "Orders Completed", value: completed, detail: "Actually completed on selected date", icon: CheckCheck, color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
        ].map(({ label, value, detail, icon: Icon, color }) => <div key={label} data-metric={label} className={`${panelClass} p-5`}>
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium text-muted-foreground">{label}</h2><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}><Icon aria-hidden="true" className="size-5" /></span></div>
          <p className="mt-3 text-4xl font-bold tracking-tight" data-slot="metric-value">{value}</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{detail}</p>
        </div>)}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section aria-labelledby="overview-title" className={`${panelClass} p-5 lg:p-6`}>
          <div className="flex items-center gap-3"><span className="rounded-xl bg-orange-500/10 p-2 text-orange-600 dark:text-orange-400"><BarChart3 aria-hidden="true" className="size-5" /></span><div><h2 id="overview-title" className="font-semibold">Orders Overview</h2><p className="mt-1 text-xs text-muted-foreground">Current status of orders placed on {date || "selected date"}</p></div></div>
          {daily.length ? <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            <div className="relative size-40 shrink-0">
              <svg aria-hidden="true" viewBox="0 0 120 120" className="size-full -rotate-90">
                <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" className="text-muted" strokeWidth="13" />
                {breakdown.map((stage, index) => {
                  const start = breakdown.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / daily.length * 100;
                  const percentage = stage.count / daily.length * 100;
                  return <circle key={stage.status} cx="60" cy="60" r="48" fill="none" stroke={stage.color} strokeWidth="13" pathLength="100" strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-start} />;
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl">{daily.length}</strong><span className="text-xs text-muted-foreground">orders placed</span></div>
            </div>
            <ul className="min-w-40 flex-1 space-y-3" aria-label="Order status breakdown">{breakdown.map(stage => <li key={stage.status} className="flex items-center gap-2 text-xs"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} /><span className="flex-1 text-muted-foreground">{stage.label}</span><strong>{stage.count}</strong></li>)}</ul>
          </div> : <EmptyChart text="No orders were placed on this date." />}
          <p className="mt-5 border-t pt-3 text-[11px] leading-5 text-muted-foreground">Ready / delivery includes rider assignment, out for delivery, and delivered awaiting staff completion. Chart totals do not change with the list search.</p>
        </section>

        <section aria-labelledby="categories-title" className={`${panelClass} p-5 lg:p-6`}>
          <div className="flex items-center gap-3"><span className="rounded-xl bg-orange-500/10 p-2 text-orange-600 dark:text-orange-400"><TrendingUp aria-hidden="true" className="size-5" /></span><div><h2 id="categories-title" className="font-semibold">Top Food Categories</h2><p className="mt-1 text-xs text-muted-foreground">Top 5 by servings ordered · selected date</p></div></div>
          {topCategories.length ? <ol className="mt-6 space-y-4" aria-label="Category servings">{topCategories.map(([name, quantity]) => <li key={name}>
            <div className="mb-2 flex items-start justify-between gap-3 text-xs"><span className="font-medium">{name}</span><span className="shrink-0 text-muted-foreground">{quantity} {quantity === 1 ? "serving" : "servings"}</span></div>
            <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-[#bd2507] to-[#f59e0b]" style={{ width: `${quantity / maxCategory * 100}%` }} /></div>
          </li>)}</ol> : <EmptyChart text="No category activity for this date." />}
          <p className="mt-5 border-t pt-3 text-[11px] leading-5 text-muted-foreground">Excludes cancelled orders. Uses current menu categories; removed menu entries appear as uncategorized, never guessed.</p>
        </section>
      </div>

      <section aria-labelledby="recent-orders-title" className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
          <div><h2 id="recent-orders-title" className="flex items-center gap-2 font-semibold"><Package aria-hidden="true" className="size-5 text-orange-600 dark:text-orange-400" />Recent Orders</h2><p className="mt-1 text-xs text-muted-foreground">Placed on {date || "selected date"} · newest first</p></div>
          <div className="flex flex-wrap gap-2">
            <FormSelect aria-label="Dashboard status filter" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border bg-background px-3 py-2 text-xs"><SelectOption value="all">All statuses</SelectOption>{stages.map(stage => <SelectOption key={stage.status} value={stage.status}>{stage.label}</SelectOption>)}</FormSelect>
            <Input aria-label="Search dashboard orders" type="search" placeholder="Search order, customer or dish" className="max-w-xs" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />
          </div>
        </div>
        <Table className="w-full table-fixed text-left text-xs [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere] [&_th]:whitespace-normal">
          <TableHeader className="bg-muted/40"><TableRow>
            <TableHead className="w-[19%]">Order / Customer</TableHead><TableHead className="hidden sm:table-cell">Items</TableHead><TableHead className="hidden w-[12%] lg:table-cell">Payment</TableHead><TableHead className="hidden w-[13%] md:table-cell">Placed</TableHead><TableHead className="w-[22%]">Status</TableHead><TableHead className="w-28 text-right">Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>{visible.map(order => <TableRow key={order.id}>
            <TableCell className="py-4"><p className="font-semibold text-[#bd2507] dark:text-[#ffb35c]">#NW-{order.orderNumber}</p><p className="mt-1 text-muted-foreground">{order.customer || "Customer"}</p></TableCell>
            <TableCell className="hidden py-4 leading-5 sm:table-cell"><span className="line-clamp-2" title={order.items}>{order.items}</span></TableCell>
            <TableCell className="hidden py-4 lg:table-cell">{order.payment === "gcash" ? "GCash" : order.payment === "cod" ? "COD" : "—"}</TableCell>
            <TableCell className="hidden py-4 text-muted-foreground md:table-cell">{clock.format(new Date(order.createdAt))}</TableCell>
            <TableCell className="py-4"><span className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-semibold ${order.status === "completed" ? "bg-green-500/10 text-green-700 dark:text-green-400" : order.status === "cancelled" ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-orange-500/10 text-orange-700 dark:text-orange-300"}`}>{operationLabel(order)}</span></TableCell>
            <TableCell className="py-4 text-right"><Button render={<Link href={`/orders/${order.id}`} aria-label={`View order ${order.orderNumber}`} />} size="sm" variant="outline">View<ChevronRight aria-hidden="true" className="size-3" /></Button></TableCell>
          </TableRow>)}</TableBody>
        </Table>
        {!visible.length && <p role="status" className="p-10 text-center text-sm text-muted-foreground">No orders match the selected date and filters.</p>}
        <nav aria-label="Dashboard pagination" className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground">
          <span aria-live="polite">Showing {filtered.length ? (currentPage - 1) * 6 + 1 : 0}–{Math.min(currentPage * 6, filtered.length)} of {filtered.length}</span>
          <div className="flex flex-wrap items-center gap-3"><Button aria-label="First dashboard page" size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(1)}>First</Button><Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>Page {currentPage} of {pages}</span><Button size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button><Button aria-label="Last dashboard page" size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(pages)}>Last</Button></div>
        </nav>
      </section>
      <p className="text-xs leading-5 text-muted-foreground">Completed uses the recorded completion date, even for orders placed earlier. Older orders without a completion timestamp are not counted in that card. All dates are Philippine time.</p>
    </>}
  </div>;
}

function EmptyChart({ text }: { text: string }) {
  return <div className="mt-6 flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-5 text-center text-sm text-muted-foreground"><BarChart3 aria-hidden="true" className="size-8 opacity-40" /><p>{text}</p></div>;
}
