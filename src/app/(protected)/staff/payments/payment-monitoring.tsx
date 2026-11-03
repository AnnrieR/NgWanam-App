"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCheck, Clock3, CreditCard, RefreshCw, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { FormSelect, SelectOption } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { manilaDate } from "@/lib/operations";
import { updatePaymentStatus } from "./actions";

export type GCashPaymentRow = {
  id: string; status: string; amount: number; sender: string | null; number: string | null; reference: string | null;
  createdAt: string; verifiedAt: string | null; orderId: string; orderNumber: string | number; orderStatus: string; customer: string | null;
};
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const timestamp = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
const labels: Record<string, string> = { pending: "Pending verification", verified: "Verified", paid: "Paid", rejected: "Rejected" };
const colors: Record<string, string> = { pending: "bg-amber-500/10 text-amber-800 dark:text-amber-300", verified: "bg-blue-500/10 text-blue-700 dark:text-blue-300", paid: "bg-green-500/10 text-green-700 dark:text-green-300", rejected: "bg-red-500/10 text-red-700 dark:text-red-300" };

export function PaymentMonitoring({ rows, failed, admin, notice, noticeError }: { rows: GCashPaymentRow[]; failed: boolean; admin: boolean; notice?: string; noticeError: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const filtered = rows.filter(row => (status === "all" || row.status === status) && (!date || manilaDate(row.createdAt) === date)
    && `${row.orderNumber} ${row.customer ?? ""} ${row.sender ?? ""} ${row.number ?? ""} ${row.reference ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  return <div className="space-y-5">
    <header className="rounded-3xl bg-[linear-gradient(115deg,#a71c04,#400d0a)] p-6 text-white lg:p-8">
      <p className="text-[10px] font-bold tracking-[0.2em] text-[#ffc42f] uppercase">Ng Wanam · {admin ? "Admin" : "Staff"} payments</p>
      <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold"><Wallet aria-hidden="true" className="size-7 text-[#ffc42f]" />GCash Payment Monitoring</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">Review sender details and reference numbers against the restaurant&apos;s actual GCash transactions. Verification is manual—not an automatic gateway check.</p>
    </header>
    {notice && <p role="status" className={`rounded-xl p-4 text-sm ${noticeError ? colors.rejected : colors.paid}`}>{notice}</p>}
    {failed ? <section role="alert" className="rounded-2xl border bg-background p-8 text-center"><h2 className="font-semibold">GCash records could not be loaded</h2><p className="mt-2 text-sm text-muted-foreground">Check the database connection and try again. Incomplete payment totals are not displayed.</p><Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>Retry</Button></section> : <>
      <section aria-label="GCash payment summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        { status: "pending", label: "Pending Verification", icon: Clock3 }, { status: "verified", label: "Verified", icon: ShieldCheck }, { status: "paid", label: "Paid", icon: CheckCheck }, { status: "rejected", label: "Rejected", icon: XCircle },
      ].map(({ status: key, label, icon: Icon }) => <div data-payment-metric={key} key={key} className="rounded-2xl border bg-background p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{label}</p><span className={`rounded-lg p-2 ${colors[key]}`}><Icon aria-hidden="true" className="size-4" /></span></div><p className="mt-3 text-3xl font-bold" data-slot="payment-count">{rows.filter(row => row.status === key).length}</p><p className="mt-1 text-xs text-muted-foreground">All GCash records · before filters</p></div>)}</section>
      <section aria-label="Filter GCash payments" className="flex flex-wrap items-end gap-3 rounded-2xl border bg-background p-4">
        <Label className="grid flex-1 gap-2 text-xs sm:min-w-56">Search<Input aria-label="Search GCash payments" type="search" placeholder="Order, customer, sender, number or reference" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></Label>
        <Label className="grid gap-2 text-xs">Payment status<FormSelect aria-label="GCash status filter" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><SelectOption value="all">All statuses</SelectOption>{Object.entries(labels).map(([value, label]) => <SelectOption key={value} value={value}>{label}</SelectOption>)}</FormSelect></Label>
        <Label className="grid gap-2 text-xs">Recorded date · PHT<Input aria-label="GCash recorded date" type="date" value={date} onChange={event => { setDate(event.target.value); setPage(1); }} /></Label>
        <Button type="button" size="sm" variant="outline" onClick={() => { setQuery(""); setStatus("all"); setDate(""); setPage(1); }}>Clear filters</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}><RefreshCw aria-hidden="true" className="size-3.5" />Refresh</Button>
      </section>
      <p className="text-xs leading-5 text-muted-foreground">GCash records only. COD remains recorded in Orders and reports; cash collection is recorded from the completed order&apos;s details.</p>
      {visible.length ? <div className="grid gap-4 lg:grid-cols-2">{visible.map(row => <article key={row.id} data-payment-id={row.id} className="flex min-w-0 flex-col rounded-2xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5"><div><Link href={`/orders/${row.orderId}`} className="font-bold text-[#bd2507] hover:underline dark:text-[#ffb35c]">Order #NW-{row.orderNumber}</Link><p className="mt-1 text-xs text-muted-foreground">{row.customer || "Customer"}</p></div><span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${colors[row.status] ?? "bg-muted"}`}>{labels[row.status] ?? row.status}</span></div>
        <div className="flex flex-1 flex-col gap-4 p-5">
          <p className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><CreditCard aria-hidden="true" className="size-4" />GCash</span><strong className="text-xl">{money.format(row.amount)}</strong></p>
          <dl className="grid gap-3 rounded-xl bg-muted/40 p-4 text-xs">{[["Sender", row.sender], ["GCash number", row.number], ["Reference number", row.reference]].map(([label, value]) => <div key={label} className="grid min-w-0 gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium [overflow-wrap:anywhere]">{value || "Not provided"}</dd></div>)}</dl>
          <div className="space-y-1 text-xs text-muted-foreground"><p>Recorded: {timestamp.format(new Date(row.createdAt))} PHT</p>{row.verifiedAt && <p>Verified: {timestamp.format(new Date(row.verifiedAt))} PHT</p>}<p>Order status: <span className="font-semibold text-foreground">{row.orderStatus.replaceAll("_", " ")}</span></p></div>
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-4">
            {row.status === "pending" && row.orderStatus !== "cancelled" && <><PaymentAction row={row} next="verified" label="Verify GCash" /><PaymentAction row={row} next="rejected" label="Reject" /></>}
            {row.status === "verified" && row.orderStatus === "completed" && <PaymentAction row={row} next="paid" label="Mark paid" />}
            {row.status === "verified" && !["completed", "cancelled"].includes(row.orderStatus) && <p className="text-xs text-muted-foreground">Verified · Mark paid becomes available after staff completes the order.</p>}
            {row.orderStatus === "cancelled" && <p className="text-xs text-muted-foreground">Cancelled order · no payment actions available.</p>}
            <Button className="ml-auto" size="sm" variant="outline" render={<Link href={`/orders/${row.orderId}`} />}>View order</Button>
          </div>
        </div>
      </article>)}</div> : <p role="status" className="rounded-2xl border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">{rows.length ? "No GCash records match these filters." : "No GCash payments recorded yet. COD payments are not listed here."}</p>}
      <nav aria-label="GCash payment pagination" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 text-xs text-muted-foreground"><span aria-live="polite">Showing {filtered.length ? (currentPage - 1) * 10 + 1 : 0}–{Math.min(currentPage * 10, filtered.length)} of {filtered.length} GCash records</span><div className="flex items-center gap-3"><Button type="button" size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>Page {currentPage} of {pages}</span><Button type="button" size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></div></nav>
    </>}
  </div>;
}

function PaymentAction({ row, next, label }: { row: GCashPaymentRow; next: string; label: string }) {
  const [open, setOpen] = useState(false);
  const busyRef = useRef(false);
  return <><Button type="button" size="sm" variant={next === "rejected" ? "destructive" : "default"} onClick={() => { busyRef.current = false; setOpen(true); }}>{label}</Button>
    <AlertDialog open={open} onOpenChange={value => { if (!busyRef.current) setOpen(value); }}><AlertDialogContent>
      <AlertDialogTitle>{label} for order #NW-{row.orderNumber}?</AlertDialogTitle>
      <AlertDialogDescription>{next === "verified" ? "Confirm that the sender, amount and reference match the restaurant’s actual GCash transaction." : next === "rejected" ? "Reject this payment only after reviewing the actual GCash details. This does not automatically cancel the order." : "Record this verified GCash payment as paid for the completed order."} Amount: {money.format(row.amount)}. Reference: {row.reference || "Not provided"}.</AlertDialogDescription>
      <Form action={updatePaymentStatus}><input type="hidden" name="paymentId" value={row.id} /><input type="hidden" name="nextStatus" value={next} /><PaymentConfirm label={label} reject={next === "rejected"} close={() => setOpen(false)} busyRef={busyRef} /></Form>
    </AlertDialogContent></AlertDialog>
  </>;
}

function PaymentConfirm({ label, reject, close, busyRef }: { label: string; reject: boolean; close: () => void; busyRef: React.RefObject<boolean> }) {
  const { pending } = useFormStatus();
  return <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button type="submit" disabled={pending} variant={reject ? "destructive" : "default"} onClick={() => { busyRef.current = true; }}>{pending ? "Saving…" : label}</Button></div>;
}
