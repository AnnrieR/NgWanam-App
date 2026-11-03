import "server-only";

import type { OperationOrder } from "@/components/operations-dashboard";
import { createClient } from "@/lib/supabase/server";

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/** Page through the real records so summary counts aren't capped at 1,000. */
export async function getDashboardOrders(): Promise<{ orders: OperationOrder[]; failed: boolean }> {
  const supabase = await createClient();
  const orders: OperationOrder[] = [];
  const batch = 500;
  for (let offset = 0; ; offset += batch) {
    const { data, error } = await supabase.from("orders")
      .select("id, order_number, status, order_type, completed_at, contact_name, contact_phone, created_at, deliveries(status, delivered_at), payments(method), order_items(item_name, quantity, menu_variants(menu_items(categories(name))))")
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + batch - 1);
    // Never present partial totals as a complete dashboard.
    if (error) return { orders: [], failed: true };
    for (const order of data ?? []) {
      const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
      const delivery = Array.isArray(order.deliveries) ? order.deliveries[0] : order.deliveries;
      orders.push({
        id: order.id, orderNumber: order.order_number, customer: order.contact_name,
        phone: order.contact_phone, createdAt: order.created_at, status: order.status,
        payment: payment?.method ?? null, orderType: order.order_type, completedAt: order.completed_at,
        deliveryStatus: delivery?.status, deliveredAt: delivery?.delivered_at,
        items: order.order_items?.map(item => `${item.quantity}x ${item.item_name}`).join(", ") || "No items",
        categories: order.order_items?.map(item => {
          const variant = first(item.menu_variants);
          const menuItem = first(variant?.menu_items);
          return { name: first(menuItem?.categories)?.name ?? "Uncategorized / removed", quantity: item.quantity };
        }) ?? [],
      });
    }
    if (!data || data.length < batch) break;
  }
  return { orders, failed: false };
}
