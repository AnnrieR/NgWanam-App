"use client";

import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { inOperationTab, manilaDate, operationLabel } from "@/lib/operations";
import type { OperationOrder } from "./operations-dashboard";

const orderTabs = [{ key: "new", label: "New" }, { key: "preparing", label: "Preparing" }, { key: "ready", label: "Ready" }, { key: "out-for-delivery", label: "Out for Delivery" }, { key: "delivered", label: "Delivered / Awaiting completion" }, { key: "completed", label: "Completed" }, { key: "cancelled", label: "Cancelled" }];
const riderTabs = [{ key: "assigned", label: "Assigned" }, { key: "out-for-delivery", label: "Out for Delivery" }, { key: "rider-delivered", label: "Delivered" }, { key: "cancelled", label: "Cancelled" }];
const time = (value?: string | null) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)) : "Not recorded";

export function OperationsOrders({ defaultTab = "new", orders, mode = "orders" }: { defaultTab?: string; orders: OperationOrder[]; mode?: "orders" | "delivery" }) {
  const tabs = mode === "delivery" ? riderTabs : orderTabs;
  const [selected, setSelected] = useState(defaultTab);
  const [query, setQuery] = useState("");
  const [orderDate, setOrderDate] = useState(() => mode === "orders" ? manilaDate(new Date()) : "");
  const [page, setPage] = useState(1);
  const tab = tabs.find((item) => item.key === selected) ?? tabs[0];
  const datedOrders = orderDate ? orders.filter((order) => manilaDate(order.createdAt) === orderDate) : orders;
  const filtered = datedOrders.filter((order) => inOperationTab(order, tab.key) && `${order.orderNumber} ${order.customer} ${order.phone} ${order.items}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const completedTime = tab.key === "completed";
  const deliveredTime = tab.key === "delivered" || tab.key === "rider-delivered";
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">{tabs.map((item) => <Button variant="ghost" aria-pressed={tab.key === item.key} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${tab.key === item.key ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-white dark:bg-slate-900"}`} key={item.key} onClick={() => { setSelected(item.key); setPage(1); }} type="button">{item.label} ({datedOrders.filter((order) => inOperationTab(order, item.key)).length})</Button>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Input aria-label="Search orders" className="max-w-sm" type="search" placeholder="Search order, customer, phone, or dish" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
      {mode === "orders" && <div className="flex flex-wrap items-center gap-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          Order date
          <Input aria-label="Filter orders by date" type="date" value={orderDate}
            className="h-9 min-w-0 rounded-full border border-stone-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:[color-scheme:dark]"
            onChange={(event) => { setOrderDate(event.currentTarget.value); setPage(1); }}
            onInput={(event) => { setOrderDate(event.currentTarget.value); setPage(1); }} />
        </Label>
        {orderDate && <Button size="sm" variant="ghost" onClick={() => { setOrderDate(""); setPage(1); }}>Clear date</Button>}
      </div>}
    </div>
    <div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900"><Table className="w-full min-w-[900px] text-left text-xs"><TableHeader className="border-b bg-muted/40"><TableRow>{["Order ID", "Customer", "Items", "Payment", completedTime ? "Completed At" : deliveredTime ? "Delivered At" : "Order Placed", "Status", "Actions"].map((label) => <TableHead className="px-4 py-3 font-semibold" key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{visible.map((order) => <TableRow key={order.id} className={`border-b last:border-0 ${mode === "delivery" && order.status === "ready" && order.deliveryStatus === "assigned" ? "bg-orange-50 dark:bg-orange-950/30" : ""}`}><TableCell className="px-4 py-4 font-semibold text-red-600 dark:text-red-400">#NW-{order.orderNumber}{mode === "delivery" && order.status === "ready" && order.deliveryStatus === "assigned" && <span className="mt-1 block text-[10px] text-orange-700 dark:text-orange-400">Awaiting rider pick-up</span>}</TableCell><TableCell className="px-4 py-4"><p className="font-semibold">{order.customer || "Customer"}</p><p className="mt-1 text-muted-foreground">{order.phone}</p></TableCell><TableCell className="max-w-56 px-4 py-4 leading-5">{order.items}</TableCell><TableCell className="px-4 py-4">{order.payment === "gcash" ? "GCash" : "COD"}{order.orderType === "pickup" && <p className="mt-1 text-amber-700 dark:text-amber-400">Pick-up</p>}</TableCell><TableCell className="px-4 py-4">{time(completedTime ? order.completedAt : deliveredTime ? order.deliveredAt : order.createdAt)}</TableCell><TableCell className="px-4 py-4 font-semibold">{operationLabel(order, mode === "delivery")}</TableCell><TableCell className="px-4 py-4"><div className="flex flex-wrap items-center gap-2"><Button render={<Link href={`/orders/${order.id}`} />} size="sm" variant="outline">View</Button>{order.extraActions}</div></TableCell></TableRow>)}</TableBody></Table>{!visible.length && <p className="p-8 text-center text-sm text-muted-foreground">No matching {tab.label.toLowerCase()} orders.</p>}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>Showing {filtered.length ? (currentPage - 1) * 8 + 1 : 0}–{Math.min(currentPage * 8, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>Page {currentPage} of {pages}</span><Button size="sm" variant="outline" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button></div></div>
  </div>;
}
