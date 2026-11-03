import { OperationsOrders } from "@/components/operations-orders";
import { one } from "@/lib/embedded";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("id, order_number, status, order_type, completed_at, contact_name, contact_phone, created_at, deliveries(status, delivered_at), payments(method), order_items(item_name, quantity)").order("created_at", { ascending: false });
  return <OperationsOrders orders={(data ?? []).map((order) => {
    const delivery = one(order.deliveries);
    return { id: order.id, orderNumber: order.order_number, customer: order.contact_name, phone: order.contact_phone, createdAt: order.created_at, status: order.status, orderType: order.order_type, completedAt: order.completed_at, deliveryStatus: delivery?.status, deliveredAt: delivery?.delivered_at, payment: one(order.payments)?.method ?? null, items: order.order_items?.map((item) => `${item.quantity}x ${item.item_name}`).join(", ") || "No items" };
  })} />;
}
