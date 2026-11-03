
import { Form } from "@/components/ui/form";

import { FormSelect, SelectOption } from "@/components/ui/form-select";
import type { ReactNode } from "react";

import { assignDelivery, updateOrderStatus } from "@/app/(protected)/staff/actions";
import { Button } from "@/components/ui/button";
import { OperationsOrders } from "@/components/operations-orders";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type StaffOrdersPageProps = { searchParams: Promise<{ error?: string; updated?: string }> };

type RiderOption = { id: string; full_name: string | null };

/**
 * Puts each transition where it belongs: one button per row, following the
 * order state machine enforced by `update_order_status`
 * (pending -> confirmed -> preparing -> ready -> completed).
 *
 * `ready -> completed` is only offered once the rider has reported the
 * delivery as delivered, because the database refuses the change otherwise.
 * A pick-up order has no rider at all, so it completes as soon as it is ready.
 */
function StaffOrderActions({
  deliveryStatus,
  orderId,
  orderStatus,
  orderType,
  riders,
}: {
  deliveryStatus: string | null;
  orderId: string;
  orderStatus: string;
  orderType: string | null;
  riders: RiderOption[];
}): ReactNode {
  const advance =
    orderStatus === "pending" ? { status: "confirmed", label: "Accept" } :
    orderStatus === "confirmed" ? { status: "preparing", label: "Start preparing" } :
    orderStatus === "preparing" ? { status: "ready", label: "Mark ready" } :
    null;

  if (advance) {
    return (
      <Form action={updateOrderStatus}>
        <input name="orderId" type="hidden" value={orderId} />
        <input name="nextStatus" type="hidden" value={advance.status} />
        <Button className="h-7 rounded-md bg-red-500 px-3 text-[11px] text-white hover:bg-red-600 dark:hover:bg-red-600" size="sm" type="submit">
          {advance.label}
        </Button>
      </Form>
    );
  }

  if (orderStatus === "ready") {
    // Nobody delivers a pick-up order, so the assign-rider step does not apply.
    if (orderType === "pickup") {
      return (
        <Form action={updateOrderStatus}>
          <input name="orderId" type="hidden" value={orderId} />
          <input name="nextStatus" type="hidden" value="completed" />
          <Button className="h-7 rounded-md bg-green-600 px-3 text-[11px] text-white hover:bg-green-700 dark:hover:bg-green-700" size="sm" type="submit">
            Complete
          </Button>
        </Form>
      );
    }

    if (!deliveryStatus) {
      if (riders.length === 0) {
        return <span className="text-[11px] text-slate-500 dark:text-slate-400">No rider available</span>;
      }
      return (
        <Form action={assignDelivery} className="flex items-center gap-1.5">
          <input name="orderId" type="hidden" value={orderId} />
          <FormSelect aria-label="Choose rider" className="h-7 max-w-36 rounded-md border border-transparent bg-input/50 px-1.5 text-[11px]" defaultValue="" name="deliveryUserId">
            <SelectOption disabled value="">Choose rider</SelectOption>
            {riders.map((rider) => (
              <SelectOption key={rider.id} value={rider.id}>{rider.full_name ?? "Rider"}</SelectOption>
            ))}
          </FormSelect>
          <Button className="h-7 rounded-md px-3 text-[11px]" size="sm" type="submit">Assign</Button>
        </Form>
      );
    }

    if (deliveryStatus === "delivered") {
      return (
        <Form action={updateOrderStatus}>
          <input name="orderId" type="hidden" value={orderId} />
          <input name="nextStatus" type="hidden" value="completed" />
          <Button className="h-7 rounded-md bg-green-600 px-3 text-[11px] text-white hover:bg-green-700 dark:hover:bg-green-700" size="sm" type="submit">
            Complete
          </Button>
        </Form>
      );
    }

    // assigned / out_for_delivery - the rider still owns this one.
    return <span className="text-[11px] text-slate-500 dark:text-slate-400">With rider</span>;
  }

  return null;
}

function OrderNotice({ error, updated }: { error?: string; updated?: string }) {
  if (error) {
    const message =
      error === "delivery-assignment-failed" || error === "invalid-delivery-assignment"
        ? "That delivery could not be assigned. An order must be Ready and can only go to an active rider."
        : error === "order-update-failed" || error === "invalid-order-status"
          ? "The order status could not be updated."
          : "That request could not be completed.";
    return <p className="mb-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{message}</p>;
  }
  if (updated === "order") {
    return <p className="mb-3 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">Order status updated.</p>;
  }
  if (updated === "delivery") {
    return <p className="mb-3 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">Rider assigned to that order.</p>;
  }
  return null;
}

export default async function StaffOrdersPage({ searchParams }: StaffOrdersPageProps) {
  await requireRole(["staff", "admin"]);
  const { error, updated } = await searchParams;
  const supabase = await createClient();

  const [ordersResult, ridersResult, deliveriesResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, order_type, completed_at, contact_name, contact_phone, created_at, payments(method), order_items(item_name, quantity)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "delivery").eq("is_active", true).order("full_name"),
    supabase.from("deliveries").select("order_id, status, delivered_at"),
  ]);

  const deliveryByOrder = new Map((deliveriesResult.data ?? []).map((row) => [row.order_id, row.status as string]));
  const riders = (ridersResult.data ?? []) as RiderOption[];
  const deliveredAt = new Map((deliveriesResult.data ?? []).map((row) => [row.order_id, row.delivered_at]));

  const orders = (ordersResult.data ?? []).map((order) => {
    const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
    return {
      id: order.id,
      orderNumber: order.order_number,
      customer: order.contact_name,
      phone: order.contact_phone,
      createdAt: order.created_at,
      status: order.status,
      payment: payment?.method ?? null,
      items: order.order_items?.map((item) => `${item.quantity}x ${item.item_name}`).join(", ") || "No items",
      orderType: order.order_type,
      deliveryStatus: deliveryByOrder.get(order.id) ?? null,
      completedAt: order.completed_at,
      deliveredAt: deliveredAt.get(order.id) ?? null,
      extraActions: (
        <StaffOrderActions
          deliveryStatus={deliveryByOrder.get(order.id) ?? null}
          orderId={order.id}
          orderStatus={order.status}
          orderType={order.order_type}
          riders={riders}
        />
      ),
    };
  });

  return (
    <>
      <OrderNotice error={error} updated={updated} />
      {/* New orders are where the next action lives, so open there. */}
      <OperationsOrders defaultTab="new" orders={orders} />
    </>
  );
}
