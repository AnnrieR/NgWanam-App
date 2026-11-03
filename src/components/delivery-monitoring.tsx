"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, CheckCheck, ClipboardList, Clock3, RefreshCw, Star, Truck } from "lucide-react";
import { Form } from "@/components/ui/form";
import { FormSelect, SelectOption } from "@/components/ui/form-select";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { assignDelivery } from "@/app/(protected)/staff/actions";
import { AssignButton } from "@/app/(protected)/staff/delivery/assign-button";

export type RiderOption = { id: string; name: string; average: number | null; count: number };
export type DeliveryRow = {
  id: string; orderId: string; number: string | number; customer: string; phone: string; address: string; orderStatus: string;
  status: string; riderId: string | null; rider: string | null; riderPhone: string | null;
  assignedAt: string | null; outAt: string | null; deliveredAt: string | null; average: number | null; ratingCount: number;
};
const stages = [
  { value: "awaiting_assignment", label: "Awaiting Rider", icon: Clock3 },
  { value: "assigned", label: "Assigned", icon: Bike },
  { value: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { value: "delivered", label: "Delivered", icon: CheckCheck },
];
const timestamp = (value: string | null) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)) : "Pending";

export function DeliveryMonitoring({ rows, riders, failed, ratingsFailed, admin, initialQuery, initialStatus, notice, noticeError }: {
  rows: DeliveryRow[]; riders: RiderOption[]; failed: boolean; ratingsFailed: boolean; admin: boolean;
  initialQuery: string; initialStatus: string; notice?: string; noticeError: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshing, startTransition] = useTransition();
  const router = useRouter();
  const destination = admin ? "/admin/delivery" : "/staff/delivery";
  const filtered = rows.filter(row => (includeCancelled || row.orderStatus !== "cancelled") && (!status || row.status === status)
    && `${row.number} ${row.customer} ${row.phone} ${row.address} ${row.rider ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  return <div className="space-y-5">
    <header className="rounded-3xl bg-[linear-gradient(115deg,#a71c04,#400d0a)] p-6 text-white lg:p-8">
      <p className="text-[10px] font-bold tracking-[0.2em] text-[#ffc42f] uppercase">Ng Wanam · Delivery operations</p>
      <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold"><Truck aria-hidden="true" className="size-7 text-[#ffc42f]" />{admin ? "Delivery Monitoring" : "Delivery"}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">Assign riders to ready delivery orders and follow each hand-off. Pick-up orders stay in Orders. Only riders update delivery progress and upload delivery proof.</p>
    </header>
    {notice && <p role="status" className={`rounded-xl p-4 text-sm ${noticeError ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-green-500/10 text-green-800 dark:text-green-300"}`}>{notice}</p>}
    {failed ? <p role="alert" className="rounded-xl border bg-red-500/10 p-5 text-sm text-red-700 dark:text-red-300">Delivery information could not be fully loaded. Refresh before assigning a rider.</p> : <section aria-label="Delivery summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stages.map(({ value, label, icon: Icon }) => <div data-delivery-metric={value} key={value} className="rounded-2xl border bg-background p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-medium text-muted-foreground">{label}</h2><span className="rounded-xl bg-orange-500/10 p-2 text-orange-600 dark:text-orange-400"><Icon aria-hidden="true" className="size-5" /></span></div><p className="mt-3 text-3xl font-bold" data-slot="delivery-count">{rows.filter(row => row.status === value && row.orderStatus !== "cancelled").length}</p><p className="mt-2 text-[10px] text-muted-foreground">All dates · excludes cancelled orders</p></div>)}</section>}
    <div className="flex items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-xs leading-6 text-muted-foreground"><ClipboardList aria-hidden="true" className="mt-1 size-4 shrink-0 text-orange-600" /><p><strong className="text-foreground">Delivered is not yet Completed.</strong> Once a rider marks Delivered, staff can complete the order in Orders. Rider ratings are customer feedback, not proof of delivery.{ratingsFailed && " Rating summaries are temporarily unavailable."}</p></div>
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-background p-4">
      <Label className="grid flex-1 gap-2 text-xs sm:min-w-56">Search deliveries<Input type="search" aria-label="Search deliveries" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Order, customer, address or rider" /></Label>
      <Label className="grid gap-2 text-xs">Delivery status<FormSelect aria-label="Filter delivery status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><SelectOption value="">All delivery statuses</SelectOption>{stages.map(stage => <SelectOption key={stage.value} value={stage.value}>{stage.label}</SelectOption>)}</FormSelect></Label>
      <Button type="button" size="sm" variant="outline" onClick={() => { setQuery(""); setStatus(""); setIncludeCancelled(false); setPage(1); }}>Clear filters</Button>
      <Button type="button" size="sm" variant="outline" disabled={refreshing} onClick={() => startTransition(() => router.refresh())}><RefreshCw aria-hidden="true" className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Refreshing…" : "Refresh deliveries"}</Button>
      <Label className="flex items-center gap-2 pb-2 text-xs"><Input type="checkbox" checked={includeCancelled} onChange={event => { setIncludeCancelled(event.target.checked); setPage(1); }} />Include cancelled orders</Label>
    </div>
    {!failed && <div className="rounded-2xl border bg-background shadow-sm">
      <Table className="w-full table-fixed text-left text-xs [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere] [&_th]:whitespace-normal">
        <TableHeader className="bg-muted/40"><TableRow><TableHead className="w-[27%]">Order / Customer</TableHead><TableHead className="w-[22%]">Rider / Rating</TableHead><TableHead className="w-[27%]">Progress · Philippine time</TableHead><TableHead className="w-[24%]">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map(row => <TableRow key={row.id} data-delivery-row={row.orderId}>
          <TableCell className="py-5"><Link href={`/orders/${row.orderId}`} className="font-semibold text-[#bd2507] hover:underline dark:text-[#ffb35c]">#NW-{row.number}</Link><p className="mt-1 font-medium">{row.customer}</p><p className="mt-2 leading-5 text-muted-foreground">{row.address}</p><p className="mt-1 text-muted-foreground">{row.phone}</p>{row.orderStatus === "cancelled" && <p className="mt-2 font-semibold text-red-600 dark:text-red-400">Order cancelled</p>}</TableCell>
          <TableCell className="py-5"><p className="font-medium">{row.rider || "Awaiting rider"}</p>{row.riderPhone && <p className="mt-1 text-muted-foreground">{row.riderPhone}</p>}{row.riderId && <p className="mt-3 flex items-start gap-1 text-[11px] text-muted-foreground"><Star aria-hidden="true" className="size-3.5 shrink-0 text-amber-500" />{ratingsFailed ? "Ratings unavailable" : row.ratingCount ? `${row.average?.toFixed(1)} / 5 · ${row.ratingCount} ${row.ratingCount===1 ? "rating" : "ratings"}` : "No ratings yet"}</p>}</TableCell>
          <TableCell className="py-5"><p className={`inline-flex rounded-lg px-2 py-1 font-semibold ${row.status === "delivered" ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-orange-500/10 text-orange-700 dark:text-orange-300"}`}>{stages.find(stage => stage.value===row.status)?.label ?? row.status}</p>{row.status === "delivered" && <p className="mt-2 text-[11px] text-muted-foreground">{row.orderStatus === "completed" ? "Order completed" : row.orderStatus === "cancelled" ? "Order cancelled" : "Awaiting staff completion"}</p>}<dl className="mt-3 space-y-2 text-[10px] leading-4 text-muted-foreground">{[["Assigned",row.assignedAt],["On the way",row.outAt],["Delivered",row.deliveredAt]].map(([label,time]) => <div key={label}><dt className="font-medium">{label}</dt><dd>{timestamp(time)}</dd></div>)}</dl></TableCell>
          <TableCell className="py-5"><div className="space-y-3">{row.status === "awaiting_assignment" && row.orderStatus === "ready" && (riders.length ? <Form action={assignDelivery} className="grid gap-2"><input type="hidden" name="orderId" value={row.orderId} /><input type="hidden" name="returnTo" value={destination} /><FormSelect name="deliveryUserId" aria-label={`Choose rider for order ${row.number}`} defaultValue="" required className="w-full min-w-0 text-xs [&_[data-slot=select-value]]:truncate"><SelectOption value="" disabled>Choose rider</SelectOption>{riders.map(rider => <SelectOption key={rider.id} value={rider.id}>{rider.name}{rider.count ? ` · ${rider.average?.toFixed(1)}★ (${rider.count})` : ""}</SelectOption>)}</FormSelect><AssignButton /></Form> : <p className="text-[11px] text-muted-foreground">No active rider accounts available.</p>)}<Button size="sm" variant="outline" render={<Link href={`/orders/${row.orderId}`} />}>View order</Button></div></TableCell>
        </TableRow>)}</TableBody>
      </Table>
      {!visible.length && <p role="status" className="p-10 text-center text-sm text-muted-foreground">No deliveries match these filters.</p>}
      <nav aria-label="Delivery pagination" className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground"><span>Showing {filtered.length ? (currentPage-1)*10+1 : 0}–{Math.min(currentPage*10,filtered.length)} of {filtered.length} deliveries</span><div className="flex items-center gap-3"><Button type="button" size="sm" variant="outline" disabled={currentPage===1} onClick={() => setPage(currentPage-1)}>Previous</Button><span>Page {currentPage} of {pages}</span><Button type="button" size="sm" variant="outline" disabled={currentPage===pages} onClick={() => setPage(currentPage+1)}>Next</Button></div></nav>
    </div>}
  </div>;
}
