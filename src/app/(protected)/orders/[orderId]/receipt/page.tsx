import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantInfo } from "@/lib/restaurant";
import { PrintButton } from "./print-button";
import styles from "./receipt.module.css";

export const metadata: Metadata = { title: "Order receipt | Ng Wanam", robots: { index: false, follow: false } };
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const date = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
const statuses: Record<string, string> = { pending: "Pending", confirmed: "Confirmed", preparing: "Preparing", ready: "Ready", completed: "Completed", cancelled: "Cancelled" };
const paymentStatuses: Record<string, string> = { pending: "Pending — not recorded as paid", verified: "Verified — not yet marked paid", paid: "Paid", rejected: "Rejected — not recorded as paid" };

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { user, profile } = await requireRole(["customer", "staff", "admin"]);
  const { orderId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) notFound();
  const supabase = await createClient();
  let query = supabase.from("orders").select("order_number, customer_id, status, order_type, contact_name, contact_phone, delivery_address, subtotal, delivery_fee, total, created_at, completed_at, payments(method, status, amount), order_items(id, item_name, variant_name, quantity, unit_price, subtotal)").eq("id", orderId);
  // Explicit ownership plus existing RLS: never use a service-role client here.
  if (profile.role === "customer") query = query.eq("customer_id", user.id);
  const { data: order, error } = await query.single();
  if (error && error.code !== "PGRST116") throw new Error("Receipt information could not be loaded. Please try again.");
  if (!order) notFound();
  const restaurant = await getRestaurantInfo();
  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  const pickup = order.order_type === "pickup";
  const method = payment?.method === "gcash" ? "GCash" : payment?.method === "cod" ? pickup ? "COD · Pay on Pick-up" : "COD · Cash on Delivery" : payment?.method === "card" ? "Card (legacy)" : "Not available";
  const items = [...order.order_items ?? []].sort((a,b) => a.id.localeCompare(b.id));

  return <main data-print-receipt className={styles.page}>
    <div className={styles.toolbar}>
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/orders/${orderId}`} className="text-sm font-semibold text-red-700 underline">← Back to Order Details</Link><PrintButton /></div>
      <p className="mt-3 text-xs text-neutral-600">Choose your printer or Save as PDF in the browser dialog. For a clean copy, turn off browser headers and footers. Printing does not change order or payment status.</p>
    </div>
    <article aria-label="Order receipt" className={styles.paper}>
      <header className={styles.brand}><p className="text-xs font-bold tracking-widest uppercase">Ng Wanam Food House</p><h1>{restaurant?.name || "Ng Wanam Food House"}</h1>{restaurant ? <><p>{restaurant.address}</p><p>{restaurant.phone_numbers.join(" · ")}</p></> : <p>Restaurant contact details unavailable.</p>}<h2 className="mt-4">Order receipt · #NW-{order.order_number}</h2><p>Order record — not an official tax invoice</p></header>
      <div className={styles.meta}>
        <dl><dt>Customer</dt><dd>{order.contact_name}</dd><dt>Contact number</dt><dd>{order.contact_phone}</dd><dt>{pickup ? "Collection" : "Delivery address"}</dt><dd>{pickup ? `Pick-up at ${restaurant?.name || "Ng Wanam Food House"}` : order.delivery_address || "Not available"}</dd></dl>
        <dl><dt>Placed · Philippine time</dt><dd>{date(order.created_at)} PHT</dd>{order.completed_at && <><dt>Completed · Philippine time</dt><dd>{date(order.completed_at)} PHT</dd></>}<dt>Order status / Type</dt><dd>{statuses[order.status] ?? order.status} · {pickup ? "Pick-up" : "Delivery"}</dd><dt>Payment method / Status</dt><dd>{method}<br /><strong data-receipt-payment-status>{payment ? paymentStatuses[payment.status] ?? payment.status : "Payment record unavailable"}</strong></dd></dl>
      </div>
      {order.status === "cancelled" ? <p className={styles.notice}>CANCELLED ORDER — retained for reference only. This copy does not confirm payment or a refund.</p> : payment?.status !== "paid" && <p className={styles.notice}>Payment has not been recorded as paid. This copy is an order summary, not proof of payment.</p>}
      <table className={styles.items}><caption className="sr-only">Saved order items and prices</caption><thead><tr><th scope="col">Item / Serving</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.item_name}<small>{item.variant_name}</small></td><td>{item.quantity}</td><td>{money.format(Number(item.unit_price))}</td><td>{money.format(Number(item.subtotal))}</td></tr>)}</tbody></table>
      {!items.length && <p className="mt-3">No item details available for this order.</p>}
      <dl className={styles.totals}><div><dt>Subtotal</dt><dd>{money.format(Number(order.subtotal))}</dd></div><div><dt>{pickup ? "Pick-up fee" : "Delivery fee"}</dt><dd>{money.format(Number(order.delivery_fee))}</dd></div><div className={styles.grandTotal}><dt>Order total</dt><dd data-receipt-total>{money.format(Number(order.total))}</dd></div></dl>
      <footer className={styles.footer}><p>Thank you for choosing Ng Wanam!</p><p>Amounts and item descriptions are from the saved order, not today&apos;s menu prices or delivery rates. Status reflects the record when this page was loaded; refresh before printing the latest copy.</p><p>No tax breakdown, official invoice number or payment-gateway confirmation is issued by this page. Contact the restaurant for an official invoice or payment concerns.</p></footer>
    </article>
  </main>;
}
