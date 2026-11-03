"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/form-input";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, PackagePlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readCart, writeCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { CustomerChatCard } from "@/components/customer-chat-card";
import { MenuImage } from "@/components/menu-image";
import { manilaDate } from "@/lib/operations";

import { loadReorderItems } from "./actions";

export type OrderSummary = {
  id: string;
  order_number: string | number;
  status: string;
  total: number | string;
  created_at: string;
  updated_at: string;
  order_type: string;
  address: string | null;
  payment: string;
  delivered_at: string | null;
  delivery_status: string | null;
  items: { name: string; quantity: number; image: string | null }[];
};

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

const tabs = [
  { key: "all", label: "All orders", statuses: null },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "active", label: "Active orders", statuses: ["pending", "confirmed", "preparing", "ready"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
] as const;

const statusStyles: Record<string, string> = {
  pending: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  confirmed: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  preparing: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  ready: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  completed: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  cancelled: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

export function OrderHistory({ orders }: { orders: OrderSummary[] }) {
  const [selected, setSelected] = useState<(typeof tabs)[number]["key"]>("all");
  const [orderDate, setOrderDate] = useState(() => manilaDate(new Date()));
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const router = useRouter();

  const tab = tabs.find((item) => item.key === selected) ?? tabs[0];
  const datedOrders = orderDate ? orders.filter((order) => manilaDate(order.created_at) === orderDate) : orders;
  const visible = tab.statuses ? datedOrders.filter((order) => (tab.statuses as readonly string[]).includes(order.status)) : datedOrders;
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageOrders = visible.slice(start, start + pageSize);

  async function reorder(orderId: string) {
    setPendingId(orderId);
    setNotice(null);
    try {
      const result = await loadReorderItems(orderId);
      if (result.error || !result.items?.length) {
        setNotice({ tone: "error", text: result.error ?? "That order could not be added to your cart." });
        return;
      }

      const cart = readCart();
      for (const incoming of result.items) {
        const existing = cart.find((item) => item.variant_id === incoming.variant_id);
        if (existing) {
          existing.quantity = Math.min(existing.quantity + incoming.quantity, incoming.available_stock);
        } else {
          cart.push(incoming);
        }
      }
      writeCart(cart);

      if (result.unavailable?.length) {
        setNotice({ tone: "info", text: `Skipped (out of stock): ${result.unavailable.join(", ")}` });
      }
      router.push("/cart");
    } catch {
      setNotice({ tone: "error", text: "Reordering failed. Please try again." });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">View all your previous orders and track recent purchases.</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const count = item.statuses ? datedOrders.filter((order) => (item.statuses as readonly string[]).includes(order.status)).length : datedOrders.length;
          const active = selected === item.key;
          return (
            <Button variant="ghost"
              aria-pressed={active}
              className={cn(
                "min-h-9 rounded-full border px-4 text-sm font-medium transition-colors",
                active
                   ? "border-red-500 bg-orange-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                  : "border-stone-200 text-slate-600 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
              key={item.key}
              type="button"
              onClick={() => { setSelected(item.key); setPage(1); setNotice(null); }}
            >
              {item.label} <span className="ml-1 text-xs opacity-70">{count}</span>
            </Button>
          );
        })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Order date
            <Input
              aria-label="Filter orders by date"
              type="date"
              value={orderDate}
              className="h-9 min-w-0 rounded-full border border-stone-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:[color-scheme:dark]"
              onChange={(event) => { setOrderDate(event.currentTarget.value); setPage(1); setNotice(null); }}
              onInput={(event) => { setOrderDate(event.currentTarget.value); setPage(1); setNotice(null); }}
            />
          </Label>
          {orderDate && <Button size="sm" variant="ghost" onClick={() => { setOrderDate(""); setPage(1); setNotice(null); }}>Clear date</Button>}
        </div>
      </div>

      {notice && (
        <p className={cn("mb-4 rounded-md px-4 py-3 text-sm", notice.tone === "error" ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300")}>
          {notice.text}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_230px]"><section>
      {visible.length ? (
        <div className="space-y-3">
          {pageOrders.map((order) => {
             const label = order.status === "cancelled" ? "Cancelled" : order.status === "completed" ? (order.order_type === "pickup" ? "Collected · Completed" : "Delivered · Completed") : order.delivery_status === "delivered" ? "Delivered · Awaiting completion" : order.delivery_status === "out_for_delivery" ? "Out for delivery" : order.status.replaceAll("_", " ");
            const active = !["completed", "cancelled"].includes(order.status);
            return (
              <article className="grid items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[1.15fr_1.4fr_1fr_1fr]" key={order.id}>
                <div><h2 className="text-sm font-bold">Order #{order.order_number}</h2><p className="mt-2 text-slate-500 dark:text-slate-400">{dateTime.format(new Date(order.created_at))}</p><span className={cn("mt-2 inline-block rounded-full px-2 py-1 font-semibold capitalize", statusStyles[order.status] ?? statusStyles.pending)}>{label}</span></div>
                <div className="lg:border-l lg:border-slate-100 lg:pl-4 dark:lg:border-slate-800"><div className="mb-2 flex items-center gap-2">{order.items.slice(0, 3).map((item, i) => <div key={`${item.name}-${i}`} className="w-12"><MenuImage name={item.name} src={item.image} className="aspect-square rounded-lg" /></div>)}{order.items.length > 3 && <span className="rounded-lg border p-2">+{order.items.length - 3}</span>}</div><p className="leading-5">{order.items.slice(0, 3).map((item) => `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`).join(", ")}{order.items.length > 3 && ` +${order.items.length - 3} more`}</p></div>
                <div className="lg:border-l lg:border-slate-100 lg:pl-4 dark:lg:border-slate-800"><p className="text-base font-bold">{currency.format(Number(order.total))}</p><p className="mt-1">{order.payment === "gcash" ? "GCash" : order.order_type === "pickup" ? "COD · Pay on Pick-up" : "COD"}</p><p className="mt-2 flex gap-1 leading-5 text-slate-500 dark:text-slate-400"><MapPin className="mt-1 size-3 shrink-0" />{order.order_type === "pickup" ? "In-store pick-up" : order.address || "Delivery"}</p></div>
                <div className="grid gap-2 text-center"><span className={cn("mx-auto rounded-full px-3 py-1 font-semibold capitalize", statusStyles[order.status] ?? statusStyles.pending)}>{label}</span>{order.delivered_at && <p className="text-[10px] text-slate-500 dark:text-slate-400">{dateTime.format(new Date(order.delivered_at))}</p>}
                  {active && <Button className="h-7 rounded-md border-red-500 text-xs text-red-600 dark:text-red-400" render={<Link href={`/orders/${order.id}`} />} size="sm" variant="outline">Track Order</Button>}
                  <Button className="h-7 rounded-md text-xs" render={<Link href={`/orders/${order.id}`} />} size="sm" variant="outline">View Details</Button>
                  {order.status === "completed" && <Button className="h-7 rounded-md bg-red-600 text-xs text-white hover:bg-red-700" disabled={pendingId === order.id} size="sm" onClick={() => reorder(order.id)}><PackagePlus className="size-3" />{pendingId === order.id ? "Adding..." : "Reorder"}</Button>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Card className="border border-stone-200 shadow-none dark:border-slate-700">
          <CardHeader><CardTitle>{orderDate ? "No matching orders" : selected === "all" ? "No orders yet" : "Nothing in this list"}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {orderDate ? "No orders match this date and status. Choose another date or clear the date filter." : selected === "all" ? "Your placed orders will appear here." : "Orders with this status will appear here."}
            </p>
            {selected !== "all" && (
              <Button className="mt-4" size="sm" variant="outline" onClick={() => { setSelected("all"); setPage(1); }}>Show all orders</Button>
            )}
          </CardContent>
        </Card>
      )}
      {visible.length > 0 && (
        <nav aria-label="Order history pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">Showing {start + 1}–{Math.min(start + pageSize, visible.length)} of {visible.length} orders</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
            <span className="text-xs text-slate-600 dark:text-slate-300">Page {currentPage} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button>
          </div>
        </nav>
      )}
      </section><CustomerChatCard /></div>
    </div>
  );
}
