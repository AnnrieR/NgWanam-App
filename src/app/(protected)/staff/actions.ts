"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidateOrderViews } from "@/lib/revalidate-order-views";

function nonNegativeInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= 2147483647 ? number : null;
}

export async function updateInventory(formData: FormData) {
  const { profile } = await requireRole(["staff", "admin"]);
  const destination = profile.role === "admin" ? "/admin/inventory" : "/staff/inventory";
  const inventoryId = String(formData.get("inventoryId") ?? "");
  const currentStock = nonNegativeInteger(formData.get("currentStock"));
  const minimumStock = nonNegativeInteger(formData.get("minimumStock"));
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");

  if (!inventoryId || !expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt)) || currentStock === null || minimumStock === null) {
    redirect(`${destination}?error=invalid-stock`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_inventory_stock_checked", {
    p_inventory_id: inventoryId,
    p_current_stock: currentStock,
    p_minimum_stock: minimumStock,
    p_expected_updated_at: expectedUpdatedAt,
  });

  if (error) {
    redirect(`${destination}?error=${error.message.includes("Stock changed") ? "stale-stock" : "inventory-update-failed"}`);
  }

  revalidatePath("/staff/inventory");
  revalidatePath("/admin/inventory");
  revalidatePath("/menu");
  revalidatePath("/staff");
  revalidatePath("/admin");
  revalidatePath("/home");
  redirect(`${destination}?updated=inventory&revision=${crypto.randomUUID()}`);
}

export async function updateOrderingSettings(formData: FormData) {
  const deliveryFee = Number(formData.get("deliveryFee"));
  const gcashQrPath = String(formData.get("gcashQrPath") ?? "").trim();

  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    redirect("/staff?error=invalid-delivery-fee");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_ordering_settings", {
    p_delivery_fee: deliveryFee,
    p_gcash_qr_path: gcashQrPath,
  });

  if (error) {
    redirect("/staff?error=settings-update-failed");
  }

  revalidatePath("/staff");
  revalidatePath("/checkout");
  redirect("/staff?updated=settings");
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");

  if (!orderId || !["confirmed", "preparing", "ready", "completed", "cancelled"].includes(nextStatus)) {
    redirect("/staff/orders?error=invalid-order-status");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_next_status: nextStatus,
  });

  if (error) {
    redirect("/staff/orders?error=order-update-failed");
  }

  revalidatePath("/staff");
  revalidatePath("/staff/orders");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidateOrderViews(orderId);
  // Land back on the list the button came from, not the dashboard.
  redirect("/staff/orders?updated=order");
}

export async function assignDelivery(formData: FormData) {
  const { profile } = await requireRole(["staff", "admin"]);
  // Only accept the two staff screens that actually contain this form.
  const returnTo = formData.get("returnTo");
  const destination = profile.role === "admin" && returnTo === "/admin/delivery" ? "/admin/delivery"
    : returnTo === "/staff/delivery" ? "/staff/delivery" : "/staff/orders";
  const orderId = String(formData.get("orderId") ?? "");
  const deliveryUserId = String(formData.get("deliveryUserId") ?? "");

  if (!orderId || !deliveryUserId) {
    redirect(`${destination}?error=invalid-delivery-assignment`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_delivery", {
    p_order_id: orderId,
    p_delivery_user_id: deliveryUserId,
  });

  if (error) {
    redirect(`${destination}?error=delivery-assignment-failed`);
  }

  revalidatePath("/staff");
  revalidatePath("/staff/orders");
  revalidatePath("/staff/delivery");
  revalidatePath("/admin/delivery");
  revalidatePath("/delivery/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidateOrderViews(orderId);
  // Land back on the list the form came from, not the dashboard.
  redirect(`${destination}?updated=delivery`);
}
