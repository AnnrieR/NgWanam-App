"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidateOrderViews } from "@/lib/revalidate-order-views";

export async function updatePaymentStatus(formData: FormData) {
  const { profile } = await requireRole(["staff", "admin"]);
  const destination = profile.role === "admin" ? "/admin/payments" : "/staff/payments";
  const paymentId = String(formData.get("paymentId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");

  if (!paymentId || !["verified", "rejected", "paid"].includes(nextStatus)) {
    redirect(`${destination}?error=invalid-status`);
  }

  const supabase = await createClient();
  const { data: record } = await supabase.from("payments").select("method, orders(status)").eq("id", paymentId).single();
  const order = Array.isArray(record?.orders) ? record.orders[0] : record?.orders;
  if (!record || record.method !== "gcash" || order?.status === "cancelled") redirect(`${destination}?error=invalid-payment`);
  const { error } = await supabase.rpc("update_payment_status", {
    p_payment_id: paymentId,
    p_next_status: nextStatus,
  });
  if (error) redirect(`${destination}?error=update-failed`);

  revalidatePath("/staff/payments");
  revalidatePath("/admin/payments");
  revalidatePath("/staff");
  const { data: payment } = await supabase.from("payments").select("order_id").eq("id", paymentId).single();
  if (payment) revalidateOrderViews(payment.order_id);
  redirect(`${destination}?updated=1`);
}

/** COD is recorded from its completed order, never from the GCash queue. */
export async function recordCodPayment(formData: FormData) {
  await requireRole(["staff", "admin"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) redirect("/orders");
  const destination = `/orders/${orderId}`;
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("status, payments(id, method, status)").eq("id", orderId).single();
  const payment = Array.isArray(order?.payments) ? order.payments[0] : order?.payments;
  if (order?.status !== "completed" || payment?.method !== "cod" || payment.status !== "pending") redirect(`${destination}?error=invalid-payment`);
  const { error } = await supabase.rpc("update_payment_status", { p_payment_id: payment.id, p_next_status: "paid" });
  if (error) redirect(`${destination}?error=payment-update-failed`);
  revalidateOrderViews(orderId);
  redirect(`${destination}?updated=payment`);
}
