import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { one } from "@/lib/embedded";

import { OrderHistory, type OrderSummary } from "./order-history";

type OrdersPageProps = { searchParams: Promise<{ error?: string; updated?: string }> };

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { user, profile } = await requireRole(["customer"]);
  const { error, updated } = await searchParams;
  const supabase = await createClient();
  const [{ data: orders, error: loadError }, { data: catalog }] = await Promise.all([
    supabase.from("orders")
      .select("id, order_number, status, total, created_at, updated_at, order_type, delivery_address, payments(method), deliveries(status, delivered_at), order_items(item_name, quantity, menu_variant_id)")
      .eq("customer_id", user.id).order("created_at", { ascending: false }),
    supabase.rpc("get_menu_catalog"),
  ]);
  const photos = new Map<string, string | null>((catalog ?? []).map((item: { variant_id: string; image_url: string | null }) => [item.variant_id, item.image_url]));
  const list: OrderSummary[] = (orders ?? []).map((order) => ({
    id: order.id, order_number: order.order_number, status: order.status, total: order.total,
    created_at: order.created_at, updated_at: order.updated_at, order_type: order.order_type,
    address: order.delivery_address, payment: one(order.payments)?.method ?? "cod",
    delivered_at: one(order.deliveries)?.delivered_at ?? null,
    delivery_status: one(order.deliveries)?.status ?? null,
    items: (order.order_items ?? []).map((item) => ({ name: item.item_name, quantity: item.quantity, image: photos.get(item.menu_variant_id) ?? null })),
  }));

  return (
    <CustomerDashboard avatarUrl={profile.avatar_url} fullName={profile.full_name} role={profile.role}>
      {(error || updated) && (
        <p className={`mb-4 rounded-md px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"}`}>
          {error ? "We could not complete that action. Please try again." : "Your order was updated."}
        </p>
      )}
      {loadError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-300">Unable to load your orders. Please try again.</p> : <OrderHistory orders={list} />}
    </CustomerDashboard>
  );
}
