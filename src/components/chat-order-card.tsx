"use client";

import Link from "next/link";
import { Check, ClipboardList, Home, PackageCheck, Truck } from "lucide-react";
import type { ChatOrderTracking } from "@/lib/chat-order-tracking";

const time = (value: string) => new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(value));

export function ChatOrderCard({ order }: { order: ChatOrderTracking }) {
  const cancelled = order.status === "cancelled";
  const stage = order.status === "completed" || order.deliveryStatus === "delivered" ? 3
    : order.pickup && order.status === "ready" || order.deliveryStatus === "out_for_delivery" ? 2
      : ["preparing", "ready"].includes(order.status) ? 1 : 0;
  const steps = [
    { label: "Order Placed", icon: ClipboardList, at: order.createdAt },
    { label: "Preparing", icon: PackageCheck, at: order.preparingAt },
    { label: order.pickup ? "Ready for Pick-up" : "Out for Delivery", icon: Truck, at: order.pickup ? order.readyAt : order.outAt },
    { label: order.pickup ? "Collected" : "Delivered", icon: Home, at: order.pickup ? order.completedAt : order.deliveredAt },
  ];
  return <div className="mt-3 w-full min-w-0 max-w-xl">
    <p className="text-xs font-semibold">Order ID: #{order.number}</p>
    {cancelled ? <p className="mt-3 font-semibold text-red-600 dark:text-red-400">This order was cancelled.</p> : <ol aria-label="Chatbot order progress" className="my-5 grid grid-cols-2 gap-y-4 sm:grid-cols-4">{steps.map(({ label, icon: Icon, at }, i) => <li key={label} className="relative px-1 text-center">
      {i < 3 && <div className={`absolute left-1/2 top-4 hidden h-0.5 w-full sm:block ${stage > i ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600"}`} />}
      <span className={`relative mx-auto grid size-9 place-items-center rounded-full border bg-white dark:bg-slate-800 ${i <= stage ? "border-red-500 text-red-600 dark:text-red-400" : "border-slate-300 text-slate-400 dark:border-slate-600"}`}>{i < stage ? <Check className="size-4" /> : <Icon className="size-4" />}</span>
      <span className={`mt-2 block text-[10px] font-semibold ${i === stage ? "text-red-600 dark:text-red-400" : ""}`}>{label}</span><span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">{at ? time(at) : i <= stage ? "Stage reached" : "Pending"}</span>
    </li>)}</ol>}
    {order.status === "confirmed" && <p className="mb-2 text-xs">Confirmed; waiting for preparation.</p>}
    {order.status === "ready" && !order.pickup && order.deliveryStatus !== "out_for_delivery" && order.deliveryStatus !== "delivered" && <p className="mb-2 text-xs">Your food is ready. Waiting for rider pick-up.</p>}
    {!cancelled && order.status !== "completed" && order.deliveryStatus !== "delivered" && <p className="text-xs">{order.requestedAt ? `Requested time: ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(order.requestedAt))} (not a guaranteed ETA)` : order.pickup ? "Collect your order once it is ready for pick-up." : "Estimated delivery time is not available yet."}</p>}
    <Link href={`/orders/${order.id}`} className="mt-3 inline-flex rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950">Open live order tracking →</Link>
  </div>;
}
