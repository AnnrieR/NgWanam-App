

import { Disclosure, DisclosureSummary } from "@/components/ui/disclosure";
import Link from "next/link";
import { ArrowLeft, Banknote, Check, Clock, Headphones, Home, MapPin, PackageCheck, Phone, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { CustomerChatCard } from "@/components/customer-chat-card";
import { CustomerServiceStrip } from "@/components/customer-service-strip";
import { MenuImage } from "@/components/menu-image";
import type { RestaurantInfo } from "@/lib/restaurant";
import { cancelOrder } from "../actions";
import { ConfirmAction } from "@/components/confirm-action";
import { ClearCart } from "./clear-cart";
import { TrackingRefresh } from "./tracking-refresh";
import { ReceiptLink } from "@/components/receipt-link";
import { DiscountRequestNotice } from "@/components/discount-request-notice";

export type TrackingOrder = {
  id: string; number: string | number; status: string; pickup: boolean; createdAt: string;
  requestedAt: string | null; address: string | null; contactName: string; contactPhone: string;
  payment: string; paymentStatus: string; subtotal: number; fee: number; total: number;
  staffNote: string | null; driverNote: string | null;
  items: { name: string; variant: string; quantity: number; price: number; subtotal: number; image: string | null }[];
  delivery: { status: string; out_for_delivery_at: string | null; delivered_at: string | null } | null;
};
export type TrackingMeta = { milestones?: Record<string, string>; rider?: { name: string | null; phone: string | null } | null };
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const date = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
const panel = "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900";

export function CustomerOrderTracking({ order, meta, restaurant, isNew, cancelled, error }: {
  order: TrackingOrder; meta: TrackingMeta; restaurant: RestaurantInfo | null; isNew: boolean; cancelled: boolean; error: boolean;
}) {
  const terminal = order.status === "cancelled" || order.status === "completed";
  const delivered = order.delivery?.status === "delivered";
  const stage = order.status === "completed" || delivered ? 3 : order.pickup && order.status === "ready" ? 2 : order.delivery?.status === "out_for_delivery" ? 2 : ["preparing", "ready"].includes(order.status) ? 1 : 0;
  const times = meta.milestones ?? {};
  const steps = [
    { title: "Order Placed", icon: ShoppingBag, time: order.createdAt },
    { title: "Preparing", icon: PackageCheck, time: times["order_status:preparing"] },
    { title: order.pickup ? "Ready for Pick-up" : "Out for Delivery", icon: order.pickup ? ShoppingBag : Truck, time: order.pickup ? times["order_status:ready"] : order.delivery?.out_for_delivery_at },
    { title: order.pickup ? "Collected" : "Delivered", icon: Home, time: order.pickup ? times["order_status:completed"] : order.delivery?.delivered_at },
  ];
  const message = order.status === "cancelled" ? "Your order was cancelled." : order.status === "completed" ? (order.pickup ? "Collected. Your order is completed." : "Delivered. Your order is completed.") : delivered ? "Delivered. Awaiting restaurant completion."
    : order.pickup && order.status === "ready" ? "Your order is ready to collect at the restaurant." : order.delivery?.status === "out_for_delivery" ? "Our rider is on the way to deliver your order!"
      : order.status === "ready" ? "Your food is ready. Waiting for rider pick-up." : order.status === "preparing" ? "Your food is being prepared." : order.status === "confirmed" ? "Your order is confirmed. Preparation will begin shortly." : "Waiting for the restaurant to confirm your order.";
  const address = order.pickup ? restaurant?.address || "Ng Wanam Food House" : order.address;
  const phone = meta.rider?.phone?.replace(/[^+\d]/g, "");
  const storePhone = restaurant?.phone_numbers?.[0];

  const items = (compact: boolean) => <div className="space-y-3">{order.items.map((item, i) => <div key={`${item.name}-${i}`} className="flex items-center gap-3"><div className={`${compact ? "w-10" : "w-12"} shrink-0`}><MenuImage src={item.image} name={item.name} className="aspect-square rounded-lg" /></div><div className="min-w-0 flex-1 text-xs"><p className="font-semibold">{item.name}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{compact ? `× ${item.quantity}` : item.variant}</p></div>{!compact && <span className="text-xs">×{item.quantity}</span>}<span className="text-xs font-semibold">{money.format(item.subtotal)}</span></div>)}</div>;
  return <div className="mx-auto max-w-[1200px]">
    {isNew && <ClearCart />}
    <TrackingRefresh active={!terminal} />
    <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400"><ArrowLeft className="size-4" />Back to Orders</Link>
    <header className="my-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Track Your Order</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{terminal ? "Your order status and details." : "Order status updates automatically every 15 seconds."}</p></div><ReceiptLink orderId={order.id} /></header>
    {isNew && <p role="status" className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">Order placed successfully!</p>}
    <DiscountRequestNotice staffNote={order.staffNote} driverNote={order.driverNote} />
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">The action could not be completed. Please try again.</p>}
    {cancelled && <p role="status" className="mb-4 rounded-xl bg-slate-100 p-4 text-sm dark:bg-slate-800">Your order has been cancelled.</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-green-100 bg-green-50/60 p-5 dark:border-green-900 dark:bg-green-950/30"><ShoppingBag className="size-10 shrink-0 text-orange-500" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{order.pickup ? "Pick-up Status" : "Delivery Status"}</p><p className="mt-1 text-lg font-bold text-green-700 dark:text-green-400">{message}</p>{order.requestedAt && <p className="mt-2 text-xs">Requested time: {date(order.requestedAt)} (not a guaranteed ETA)</p>}</div>
          {!order.pickup && !terminal && <div>{phone ? <a href={`tel:${phone}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"><Phone className="size-4" />Contact Rider</a> : <span className="text-xs text-slate-500 dark:text-slate-400">Rider contact will appear after assignment.</span>}{meta.rider?.name && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{meta.rider.name}</p>}</div>}
        </div>
        {order.status !== "cancelled" && <section className={panel} aria-label="Order progress"><ol className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">{steps.map(({ title, icon: Icon, time }, i) => <li key={title} className="relative px-1 text-center">
          {i < 3 && <div className={`absolute left-1/2 top-5 hidden h-1 w-full sm:block ${stage > i ? "bg-red-600" : "bg-slate-200 dark:bg-slate-700"}`} />}
          <span className={`relative mx-auto grid size-10 place-items-center rounded-full ${i <= stage ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{i < stage ? <Check className="size-5" /> : <Icon className="size-5" />}</span><p className={`mt-3 text-xs font-bold ${i === stage ? "text-red-600 dark:text-red-400" : ""}`}>{title}</p><p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">{time ? date(time) : i <= stage ? "Stage reached" : "Pending"}</p>
        </li>)}</ol></section>}
        <section className={panel}><h2 className="mb-4 text-base font-bold">Order Details</h2><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div><div className="mb-4 grid grid-cols-2 gap-3 border-b border-slate-200 pb-4 text-xs dark:border-slate-700"><div><p className="text-slate-500 dark:text-slate-400">Order ID</p><p className="mt-1 font-bold">#{order.number}</p></div><div><p className="text-slate-500 dark:text-slate-400">Order Placed</p><p className="mt-1 font-semibold">{date(order.createdAt)}</p></div></div>{items(false)}
            <Disclosure className="mt-4 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700"><DisclosureSummary className="cursor-pointer text-center font-semibold">View Full Order Summary</DisclosureSummary><div className="mt-3 space-y-2"><p>Contact: {order.contactName} · {order.contactPhone}</p><p>Payment status: {order.paymentStatus}</p><p>Subtotal: {money.format(order.subtotal)}</p><p>{order.pickup ? "Pick-up" : "Delivery"} fee: {money.format(order.fee)}</p><p className="font-bold">Total: {money.format(order.total)}</p>{order.staffNote && <p>Kitchen notes: {order.staffNote}</p>}{order.driverNote && <p>Delivery notes: {order.driverNote}</p>}</div></Disclosure>
          </div>
          <div className="space-y-5 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800"><div className="flex gap-2"><MapPin className="size-5 shrink-0" /><div><h3 className="font-bold">{order.pickup ? "Pick-up Location" : "Delivery Address"}</h3><p className="mt-2 leading-5">{address}</p></div></div><div className="flex gap-2"><Clock className="size-5 shrink-0" /><div><h3 className="font-bold">{order.requestedAt ? "Requested Time" : "Delivery Updates"}</h3><p className="mt-2 leading-5">{order.requestedAt ? date(order.requestedAt) : order.pickup ? "Wait for Ready for Pick-up before collecting." : "No delivery estimate available yet."}</p></div></div><div className="flex gap-2"><Banknote className="size-5 shrink-0" /><div><h3 className="font-bold">Payment Method</h3><p className="mt-2">{order.payment === "gcash" ? "GCash" : order.pickup ? "COD · Pay on Pick-up" : "COD (Cash on Delivery)"}</p></div></div><div className="flex gap-2 rounded-lg border border-orange-100 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/40"><ShieldCheck className="size-5 shrink-0 text-orange-500" /><p className="leading-5">Your order is in good hands! Status updates appear here as the restaurant and rider process your order.</p></div></div>
        </div></section>
        {["pending", "confirmed"].includes(order.status) && <ConfirmAction action={cancelOrder} fields={{ orderId: order.id }} title="Cancel this order?" description="This cancels your order and releases its reserved stock." triggerLabel="Cancel Order" confirmLabel="Confirm cancellation" />}
      </section>
      <aside className="space-y-4"><section className={panel}><h2 className="mb-5 text-lg font-bold">Order Summary</h2>{items(true)}<div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-700"><div className="flex justify-between"><span>Subtotal</span><span>{money.format(order.subtotal)}</span></div><div className="flex justify-between"><span>{order.pickup ? "Pick-up Fee" : "Delivery Fee"}</span><span>{money.format(order.fee)}</span></div><div className="flex justify-between border-t border-slate-200 pt-4 font-bold dark:border-slate-700"><span>Total</span><span className="text-red-600 dark:text-red-400">{money.format(order.total)}</span></div></div></section><CustomerChatCard /><section className={`${panel} bg-slate-50 dark:bg-slate-800`}><div className="flex gap-3"><Headphones className="size-6 shrink-0" /><div><h2 className="text-sm font-bold">Need help?</h2><p className="mt-2 text-xs leading-5">Contact the restaurant during opening hours.</p>{restaurant?.operating_hours && <p className="mt-1 text-xs">{restaurant.operating_hours}</p>}{storePhone && <a href={`tel:${storePhone.replace(/[^+\d]/g, "")}`} className="mt-3 block text-xs font-bold text-red-600 dark:text-red-400">Call us: {storePhone}</a>}</div></div></section></aside>
    </div><CustomerServiceStrip />
  </div>;
}
