import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PaymentMonitoring, type GCashPaymentRow } from "./payment-monitoring";

type PaymentsPageProps = { searchParams: Promise<{ error?: string; updated?: string }> };

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const { profile } = await requireRole(["staff", "admin"]);
  const supabase = await createClient();
  const rows: GCashPaymentRow[] = [];
  let failed = false;
  // Filter on the server, not merely hide COD cards in the browser.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("payments")
      .select("id, status, amount, gcash_sender_name, gcash_number, gcash_reference_number, created_at, verified_at, orders(id, order_number, status, contact_name)")
      .eq("method", "gcash").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) { failed = true; break; }
    for (const payment of data ?? []) {
      const order = Array.isArray(payment.orders) ? payment.orders[0] : payment.orders;
      if (!order) continue;
      rows.push({ id: payment.id, status: payment.status, amount: Number(payment.amount), sender: payment.gcash_sender_name,
        number: payment.gcash_number, reference: payment.gcash_reference_number, createdAt: payment.created_at,
        verifiedAt: payment.verified_at, orderId: order.id, orderNumber: order.order_number, orderStatus: order.status, customer: order.contact_name });
    }
    if (!data || data.length < 500) break;
  }
  const { error, updated } = await searchParams;
  return <PaymentMonitoring rows={failed ? [] : rows} failed={failed} admin={profile.role === "admin"} notice={error ? "Payment was not updated. The record may have changed or this action is not allowed." : updated ? "GCash payment status updated." : undefined} noticeError={Boolean(error)} />;
}
