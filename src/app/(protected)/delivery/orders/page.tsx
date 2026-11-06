
import { Form } from "@/components/ui/form";
import type { ReactNode } from "react";

import { updateDeliveryStatus } from "@/app/(protected)/delivery/actions";
import { DeliverySubmit } from "./delivery-submit";
import { DeliveryProofDialog } from "./delivery-proof-dialog";
import { OperationsOrders } from "@/components/operations-orders";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";

type DeliveryOrdersPageProps = { searchParams: Promise<{ error?: string; updated?: string }> };

/**
 * Mirrors the transitions allowed by `update_delivery_status`:
 * assigned -> out_for_delivery -> delivered. A delivered row is terminal, so
 * the button disappears and only the label stays.
 */
function RiderActions({ deliveryId, status, orderStatus }: { deliveryId: string; status: string; orderStatus: string }): ReactNode {
  if (orderStatus === "cancelled") return <span className="text-xs text-red-600">Cancelled — do not deliver</span>;
  if (orderStatus !== "ready" && status !== "delivered") return null;
  if (status === "assigned") {
    return (
      <Form action={updateDeliveryStatus}>
        <input name="deliveryId" type="hidden" value={deliveryId} />
        <input name="nextStatus" type="hidden" value="out_for_delivery" />
        <DeliverySubmit>Start delivery</DeliverySubmit>
      </Form>
    );
  }

  if (status === "out_for_delivery") {
    return <DeliveryProofDialog deliveryId={deliveryId} />;
  }

  return <span className="text-[11px] font-medium text-green-700 dark:text-green-400">Delivered</span>;
}

function DeliveryNotice({ error, updated }: { error?: string; updated?: string }) {
  if (error) {
    const message =
      error === "proof-invalid" ? "Proof photo is optional. If uploading, choose one valid JPG, PNG, or WebP image smaller than 1 MB."
        : error === "proof-upload-failed" ? "Proof photo could not be uploaded. Refresh and check that the order is still active."
        : error === "update-failed" || error === "invalid-status"
          ? "Delivery update could not be saved. The order must be active with a valid stock reservation. Proof photos are optional. Refresh and ask staff to review any stock issue."
        : "That request could not be completed.";
    return <p className="mb-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{message}</p>;
  }
  if (updated === "1") {
    return <p className="mb-3 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">Delivery updated. The order will show as ready to complete for staff.</p>;
  }
  return null;
}

export default async function DeliveryOrdersPage({ searchParams }: DeliveryOrdersPageProps) {
  const { user } = await requireRole(["delivery"]);
  const { error, updated } = await searchParams;
  const supabase = await createClient();
  const { data: summaries, error: ratingsError } = await supabase.rpc("get_rider_rating_summaries");
  const summary = (summaries as { rider_id: string; average_rating: number; rating_count: number }[] | null)?.find(row => row.rider_id === user.id);
  const { data } = await supabase
    .from("deliveries")
    .select("id, created_at, status, delivered_at, orders(id, order_number, status, order_type, completed_at, created_at, contact_name, contact_phone, payments(method), order_items(item_name, quantity))")
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });

  const orders = (data ?? []).flatMap((delivery) => {
    const order = Array.isArray(delivery.orders) ? delivery.orders[0] : delivery.orders;
    if (!order) return [];
    const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
    return [{
      id: order.id,
      orderNumber: order.order_number,
      customer: order.contact_name,
      phone: order.contact_phone,
      createdAt: order.created_at,
      status: order.status,
      orderType: order.order_type,
      deliveryStatus: delivery.status,
      completedAt: order.completed_at,
      deliveredAt: delivery.delivered_at,
      payment: payment?.method ?? null,
      items: order.order_items?.map((item) => `${item.quantity}x ${item.item_name}`).join(", ") || "No items",
      extraActions: <RiderActions deliveryId={delivery.id} status={delivery.status as string} orderStatus={order.status} />,
    }];
  });

  return (
    <>
      <DeliveryNotice error={error} updated={updated} />
      {/* Active work sits in "On the Way" - that is where a rider's buttons are. */}
      <h1 className="mb-4 text-3xl font-bold">Assigned Deliveries</h1>
      <section aria-label="Your rider rating" className="mb-5 flex items-center gap-3 rounded-2xl border bg-background p-4"><Star aria-hidden="true" className="size-6 text-amber-500" /><div><h2 className="text-sm font-semibold">Your rider rating</h2><p className="mt-1 text-sm text-muted-foreground">{ratingsError ? "Ratings temporarily unavailable." : summary ? `${Number(summary.average_rating).toFixed(1)} / 5 · ${summary.rating_count} customer ${Number(summary.rating_count) === 1 ? "rating" : "ratings"}` : "No ratings yet. Customers can rate you after delivery."}</p></div></section>
      <OperationsOrders defaultTab="assigned" mode="delivery" orders={orders} />
    </>
  );
}
