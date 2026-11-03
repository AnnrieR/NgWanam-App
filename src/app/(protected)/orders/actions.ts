"use server";

import { redirect } from "next/navigation";

import { type CartItem, type ReorderResult } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";
import { revalidateOrderViews } from "@/lib/revalidate-order-views";

export async function cancelOrder(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/orders?error=cancel-failed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_own_order", { p_order_id: orderId });
  if (error) redirect(`/orders/${orderId}?error=cancel-failed`);

  revalidateOrderViews(orderId);
  redirect(`/orders/${orderId}?cancelled=1`);
}

/**
 * Rebuilds a previous order's lines against the *current* catalog so stock and
 * prices are re-validated before anything is written to the cart.
 */
export async function loadReorderItems(orderId: string): Promise<ReorderResult> {
  if (!orderId) return { error: "That order could not be read." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again to reorder." };

  const [order, items, catalog] = await Promise.all([
    supabase.from("orders").select("id").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("menu_variant_id, item_name, quantity").eq("order_id", orderId),
    supabase.rpc("get_menu_catalog"),
  ]);

  if (order.error || !order.data) return { error: "We could not open that order." };
  if (items.error) return { error: "We could not read that order's items." };
  if (catalog.error) return { error: "We could not check the menu right now." };

  const stockByVariant = new Map(
    ((catalog.data ?? []) as Array<{
      variant_id: string;
      variant_name: string;
      price: number;
      available_stock: number;
    }>).map((variant) => [variant.variant_id, variant]),
  );

  const rebuilt: CartItem[] = [];
  const unavailable: string[] = [];

  for (const line of items.data ?? []) {
    const current = stockByVariant.get(line.menu_variant_id);
    if (!current || current.available_stock < 1) {
      unavailable.push(line.item_name);
      continue;
    }
    const quantity = Math.min(line.quantity, current.available_stock);
    const existing = rebuilt.find((entry) => entry.variant_id === line.menu_variant_id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + line.quantity, current.available_stock);
      continue;
    }
    rebuilt.push({
      variant_id: line.menu_variant_id,
      item_name: line.item_name,
      variant_name: current.variant_name,
      price: Number(current.price),
      available_stock: current.available_stock,
      quantity,
    });
  }

  if (!rebuilt.length) {
    return { error: "None of those items are available right now.", unavailable };
  }

  return { items: rebuilt, unavailable };
}

export async function updateOrderFromDetails(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  if (!orderId || !["confirmed", "preparing", "ready", "completed", "cancelled"].includes(nextStatus)) {
    redirect("/staff?error=invalid-order-status");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_next_status: nextStatus,
  });
  if (error) redirect(`/orders/${orderId}?error=update-failed`);

  revalidateOrderViews(orderId);
  redirect(`/orders/${orderId}?updated=${nextStatus}`);
}
