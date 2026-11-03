
import { Form } from "@/components/ui/form";

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDollarSign, ClipboardList, MapPin, MessageSquare, PackageCheck, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { RoleDashboard } from "@/components/role-dashboard";
import { requireRole } from "@/lib/auth";
import { getRestaurantInfo } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

import { updateOrderFromDetails } from "../actions";
import { ClearCart } from "./clear-cart";
import { CustomerOrderTracking, type TrackingMeta } from "./customer-order-tracking";
import { ConfirmAction } from "@/components/confirm-action";
import { recordCodPayment } from "../../staff/payments/actions";
import { DeliveryRating } from "@/components/delivery-rating";
import { ReceiptLink } from "@/components/receipt-link";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

type OrderPageProps = { params: Promise<{ orderId: string }>; searchParams: Promise<{ new?: string; cancelled?: string; updated?: string; error?: string }> };

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  // Every role opens this page: customers review/cancel, staff accept and
  // advance, delivery riders watch progress, admins do both. `requireRole` also
  // doubles as the ownership gate — non-admins only reach orders they may see.
  const { profile } = await requireRole(["customer", "staff", "delivery", "admin"]);
  const { orderId } = await params;
  const { new: isNew, cancelled, updated, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: order }, { data: statuses }, { data: delivery }] = await Promise.all([
    supabase.from("orders").select("order_number, status, order_type, contact_name, contact_phone, delivery_address, note_to_staff, note_to_driver, subtotal, delivery_fee, total, created_at, required_at, payments(method, status), order_items(item_name, variant_name, quantity, unit_price, subtotal, menu_variant_id)").eq("id", orderId).single(),
    supabase.from("orders").select("status").in("status", ["pending", "confirmed", "preparing", "ready", "completed"]),
    // `deliveries.order_id` is unique, so at most one row per order.
    supabase.from("deliveries").select("status, out_for_delivery_at, delivered_at, proof_photo_path").eq("order_id", orderId).maybeSingle(),
  ]);
  if (!order) notFound();
  const proof = delivery?.proof_photo_path ? await supabase.storage.from("delivery-proofs").createSignedUrl(delivery.proof_photo_path, 600) : null;

  if (profile.role === "customer") {
    const [tracking, catalog, info] = await Promise.all([
      supabase.rpc("get_order_tracking", { p_order_id: orderId }),
      supabase.rpc("get_menu_catalog"),
      getRestaurantInfo(),
    ]);
    const photos = new Map<string, string | null>((catalog.data ?? []).map((row: { variant_id: string; image_url: string | null }) => [row.variant_id, row.image_url]));
    const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
    return <CustomerDashboard avatarUrl={profile.avatar_url} fullName={profile.full_name} role={profile.role}>
      {proof?.data?.signedUrl && <a href={proof.data.signedUrl} target="_blank" rel="noopener noreferrer" className="mb-4 inline-block text-sm text-red-600 underline">View proof-of-delivery photo</a>}
      <CustomerOrderTracking meta={(tracking.data ?? {}) as TrackingMeta} restaurant={info} isNew={isNew === "1"} cancelled={cancelled === "1"} error={Boolean(error)} order={{
        id: orderId, number: order.order_number, status: order.status, pickup: order.order_type === "pickup", createdAt: order.created_at,
        requestedAt: order.required_at, address: order.delivery_address, contactName: order.contact_name, contactPhone: order.contact_phone,
        payment: payment?.method ?? "cod", paymentStatus: payment?.status ?? "pending", subtotal: Number(order.subtotal), fee: Number(order.delivery_fee), total: Number(order.total),
        staffNote: order.note_to_staff, driverNote: order.note_to_driver, delivery,
        items: (order.order_items ?? []).map((item) => ({ name: item.item_name, variant: item.variant_name, quantity: item.quantity, price: Number(item.unit_price), subtotal: Number(item.subtotal), image: photos.get(item.menu_variant_id) ?? null })),
      }} />
      {order.order_type === "delivery" && <DeliveryRating orderId={orderId} />}
    </CustomerDashboard>;
  }

  const isPickup = order.order_type === "pickup";
  // A pick-up order has no delivery record at all, so nothing has to be
  // "delivered" before staff can complete it.
  const restaurant = isPickup ? await getRestaurantInfo() : null;

  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  const counts = Object.fromEntries(["pending", "preparing", "ready", "completed"].map((status) => [status, statuses?.filter((orderStatus) => orderStatus.status === status).length ?? 0]));
  // Staff and admins accept/advance; riders only watch progress.
  const canManageOrder = profile.role === "staff" || profile.role === "admin";
  const next =
    order.status === "pending" ? { status: "confirmed", label: "Accept Order", className: "bg-red-500 hover:bg-red-600" } :
    order.status === "confirmed" ? { status: "preparing", label: "Go to Preparing Orders", className: "bg-red-500 hover:bg-red-600" } :
    order.status === "preparing" ? { status: "ready", label: "Mark as Ready", className: "bg-amber-500 hover:bg-amber-600" } :
    // `update_order_status` refuses ready -> completed until the rider reports
    // the delivery as delivered, so the button is gated below rather than
    // failing on submit.
    order.status === "ready" ? { status: "completed", label: "Complete Order", className: "bg-green-600 hover:bg-green-700" } :
    null;
  const updatedMessage = updated === "confirmed" ? "Order Accepted" : updated === "preparing" ? "Order is now Preparing" : updated === "ready" ? "Order is Ready" : updated === "completed" ? "Order Completed" : null;
  const backHref = profile.role === "delivery" ? "/delivery/orders" : profile.role === "admin" ? "/admin/orders" : "/staff/orders";
  // Pick-up never gets a delivery record, so it reads as a store milestone
  // instead of "Not assigned".
  const deliveryLabel = isPickup ? "In store" : !delivery ? "Not assigned" : delivery.status === "assigned" ? "Assigned" : delivery.status === "out_for_delivery" ? "On the way" : "Delivered";
  const deliveryDot = isPickup ? "bg-emerald-600" : !delivery ? "bg-slate-400" : delivery.status === "delivered" ? "bg-green-600" : delivery.status === "out_for_delivery" ? "bg-amber-500" : "bg-blue-600";
  const canComplete = isPickup || delivery?.status === "delivered";

  const content = (
      <div className="mx-auto max-w-[1440px]">
        {isNew === "1" && <ClearCart />}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100" href={backHref}><ArrowLeft className="size-3.5" />Back to Orders</Link>
          {proof?.data?.signedUrl && <a href={proof.data.signedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 underline dark:text-red-400">View proof-of-delivery photo</a>}
        </div>
        {canManageOrder && <div className="mt-3"><ReceiptLink orderId={orderId} /></div>}
        {canManageOrder && <p className="mt-3 text-xs text-muted-foreground">Delivery stock deducts once when the rider confirms Delivered with proof. Completing a delivered order does not deduct again. Pick-up stock deducts on Staff Completed.</p>}
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_11rem]">
          <main>
            <header className="mb-5 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{updatedMessage || "Order Details"}</h1>{order.status === "preparing" && <span className="rounded-sm bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600 dark:bg-amber-950 dark:text-amber-400">Preparing</span>}</div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{order.status === "preparing" ? "This order is being prepared. Mark it as ready when complete." : "Review order details and update its status."}</p></div><div className="text-right text-xs"><p className="text-slate-500 dark:text-slate-400">Order ID</p><p className="font-semibold text-red-500 dark:text-red-400">#NW-{order.order_number}</p><p className="mt-1 text-slate-600 dark:text-slate-300">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}</p></div></header>
            {updatedMessage && <Card className="mb-4 rounded-lg border border-green-100 bg-green-50 py-0 shadow-none dark:border-green-950 dark:bg-green-950/50"><CardContent className="flex gap-3 px-4 py-4"><CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-400" /><div><p className="text-sm font-semibold text-green-800 dark:text-green-300">{updatedMessage}</p><p className="mt-1 text-xs text-green-800/80 dark:text-green-300/80">The order status has been updated successfully.</p></div></CardContent></Card>}
            {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">Order or payment could not be updated. Review the latest status before trying again.</p>}
            {updated === "payment" && <p role="status" className="mb-4 rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-300">COD cash collection recorded. Payment is now paid.</p>}
            {cancelled === "1" && <p className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">Order cancelled.</p>}

            <Card className="rounded-lg border border-slate-200 py-0 shadow-none dark:border-slate-700"><CardHeader className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><CardTitle>Customer Information</CardTitle></CardHeader><CardContent className="grid gap-5 px-5 py-5 sm:grid-cols-[1.25fr_.75fr_.75fr]"><div className="flex gap-3"><span className="grid size-11 place-items-center rounded-full bg-red-100 text-red-500 dark:bg-red-950 dark:text-red-400"><UserRound className="size-5" /></span><div className="text-xs leading-5"><p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{order.contact_name}</p><p>{order.contact_phone}</p><p className="mt-1 flex gap-1"><MapPin className="mt-0.5 size-3 shrink-0" />{isPickup ? `Pick up at Ng Wanam Food House${restaurant?.address ? `, ${restaurant.address}` : ""}` : order.delivery_address}</p></div></div><div className="border-l border-slate-100 pl-5 text-xs dark:border-slate-800"><p className="text-slate-500 dark:text-slate-400">Payment Method</p><p className="mt-2 flex items-center gap-1.5 font-semibold"><CircleDollarSign className="size-4 text-blue-500 dark:text-blue-400" />{payment?.method === "gcash" ? "GCash" : payment?.method?.toUpperCase()}</p></div><div className="border-l border-slate-100 pl-5 text-xs dark:border-slate-800"><p className="text-slate-500 dark:text-slate-400">Order Type</p><p className="mt-2 flex items-center gap-1.5 font-semibold"><PackageCheck className="size-4" />{isPickup ? "Pick up" : "Delivery"}</p></div></CardContent></Card>

            <Card className="mt-4 rounded-lg border border-slate-200 py-0 shadow-none dark:border-slate-700"><CardHeader className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><CardTitle>Order Items</CardTitle></CardHeader><CardContent className="p-0"><Table className="w-full text-left text-xs"><TableHeader className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400"><TableRow><TableHead className="px-5 py-3 font-medium">Item</TableHead><TableHead className="px-3 py-3 font-medium">Quantity</TableHead><TableHead className="px-5 py-3 text-right font-medium">Price</TableHead></TableRow></TableHeader><TableBody>{order.order_items?.map((item) => <TableRow className="border-b border-slate-100 last:border-0 dark:border-slate-800" key={`${item.item_name}-${item.variant_name}`}><TableCell className="px-5 py-3"><p className="font-medium text-slate-800 dark:text-slate-100">{item.item_name}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{item.variant_name}</p></TableCell><TableCell className="px-3 py-3 text-slate-700 dark:text-slate-300">{item.quantity}</TableCell><TableCell className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">{currency.format(Number(item.subtotal))}</TableCell></TableRow>)}</TableBody><tfoot className="text-xs"><TableRow><TableCell colSpan={2} className="pt-4 pb-1 pl-5 text-right">Subtotal</TableCell><TableCell className="px-5 pt-4 pb-1 text-right">{currency.format(Number(order.subtotal))}</TableCell></TableRow><TableRow><TableCell colSpan={2} className="py-1 pl-5 text-right">{isPickup ? "Pick-up fee" : "Delivery Fee"}</TableCell><TableCell className="px-5 py-1 text-right">{isPickup ? <span className="text-slate-500 dark:text-slate-400">Free</span> : currency.format(Number(order.delivery_fee))}</TableCell></TableRow><TableRow className="font-semibold"><TableCell colSpan={2} className="pt-1 pb-4 pl-5 text-right">Total Amount</TableCell><TableCell className="px-5 pt-1 pb-4 text-right text-red-500 dark:text-red-400">{currency.format(Number(order.total))}</TableCell></TableRow></tfoot></Table></CardContent></Card>

            {(order.note_to_staff || order.note_to_driver) && <Card className="mt-4 rounded-lg border border-slate-200 py-0 shadow-none dark:border-slate-700"><CardHeader className="px-5 py-3"><CardTitle className="flex items-center gap-2"><MessageSquare className="size-4 text-red-500 dark:text-red-400" />Order Notes</CardTitle></CardHeader><CardContent className="px-5 pb-4"><p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{order.note_to_staff || order.note_to_driver}</p></CardContent></Card>}

            {canManageOrder && next && <div className="mt-5 flex justify-end gap-3">{order.status === "pending" && <Form action={updateOrderFromDetails}><input name="orderId" type="hidden" value={orderId} /><input name="nextStatus" type="hidden" value="cancelled" /><Button className="rounded-md" type="submit" variant="outline">Reject Order</Button></Form>}{order.status === "ready" && !canComplete ? <p className="rounded-md border border-dashed border-slate-300 px-4 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">{delivery ? "Waiting for the rider to mark this delivery as delivered." : "Assign a rider from Orders before completing."}</p> : <Form action={updateOrderFromDetails}><input name="orderId" type="hidden" value={orderId} /><input name="nextStatus" type="hidden" value={next.status} /><Button className={`rounded-md ${next.className}`} type="submit">{next.label}</Button></Form>}</div>}
            {canManageOrder && payment?.method === "cod" && <Card className="mt-4 border shadow-none"><CardHeader><CardTitle>COD payment</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Payment status: <strong className="text-foreground">{payment.status}</strong> · {currency.format(Number(order.total))}</p>{order.status === "completed" && payment.status === "pending" ? <ConfirmAction action={recordCodPayment} fields={{ orderId }} title="Record COD cash collection?" description={`Confirm that ${currency.format(Number(order.total))} was actually collected for order #NW-${order.order_number}. This records the payment; it does not charge the customer online.`} triggerLabel="Record cash collected" confirmLabel="Confirm cash collected" variant="default" /> : payment.status !== "paid" && <p className="text-xs text-muted-foreground">Cash collection can be recorded after staff completes the order.</p>}</CardContent></Card>}
          </main>
          <aside className="space-y-4"><Card className="rounded-lg border border-slate-200 py-0 shadow-none dark:border-slate-700"><CardHeader className="border-b border-slate-100 px-4 py-4 dark:border-slate-800"><CardTitle className="flex items-center gap-2"><ClipboardList className="size-4" />Order Overview</CardTitle></CardHeader><CardContent className="space-y-3 px-4 py-4 text-xs">{[["New", counts.pending, "bg-blue-600"], ["Preparing", counts.preparing, "bg-amber-500"], ["Ready", counts.ready, "bg-green-600"], ["Completed", counts.completed, "bg-blue-600"]].map(([label, count, color]) => <div className="flex items-center justify-between" key={String(label)}><span className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${color}`} />{label}</span><span className="font-semibold">{count}</span></div>)}<div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800"><span className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${deliveryDot}`} />{isPickup ? "Pick up" : "Delivery"}</span><span className="font-semibold">{deliveryLabel}</span></div><Button className="mt-3 w-full rounded-md" render={<Link href={backHref} />} size="sm" variant="outline">View All Orders</Button></CardContent></Card></aside>
        </div>
      </div>
  );

  return <RoleDashboard fullName={profile.full_name} role={profile.role}>{content}</RoleDashboard>;
}
