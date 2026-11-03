"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export type CheckoutState = { error?: string };

function stringValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function placeOrder(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  await requireRole(["customer"]);
  const contactName = stringValue(formData, "contactName");
  const contactPhone = stringValue(formData, "contactPhone");
  const deliveryAddress = stringValue(formData, "deliveryAddress");
  const paymentMethod = stringValue(formData, "paymentMethod");
  // Default to delivery so a stale or hand-edited form cannot invent a type.
  const orderType = stringValue(formData, "orderType") === "pickup" ? "pickup" : "delivery";
  const deliveryAreaId = stringValue(formData,"deliveryAreaId");
  const expectedFeeValue = stringValue(formData,"expectedDeliveryFee");
  const expectedFee = Number(expectedFeeValue);
  if (orderType === "delivery" && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deliveryAreaId) || !expectedFeeValue || !Number.isFinite(expectedFee) || expectedFee<0)) {
    return { error: "Choose a supported delivery area and review its fee before placing your order." };
  }

  if (!contactName || !contactPhone) {
    return { error: "Enter your contact details." };
  }
  // Picking up in store means no address, and no delivery fee to charge.
  if (orderType === "delivery" && !deliveryAddress) {
    return { error: "Enter your contact and delivery details." };
  }
  // Cash and GCash only — debit/credit cards were removed from the offering.
  if (paymentMethod !== "cod" && paymentMethod !== "gcash") {
    return { error: "Choose a payment method." };
  }

  let cart: Array<{ variant_id: string; quantity: number }>;
  try {
    const parsed = JSON.parse(stringValue(formData, "cart"));
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((item) => typeof item?.variant_id !== "string" || !Number.isInteger(item?.quantity) || item.quantity < 1)) {
      return { error: "Your cart is empty or invalid. Please return to the menu." };
    }
    cart = parsed.map((item) => ({ variant_id: item.variant_id, quantity: item.quantity }));
  } catch {
    return { error: "Your cart is invalid. Please return to the menu." };
  }

  const requiredAtValue = stringValue(formData, "requiredAt");
  const requiredAt = requiredAtValue ? new Date(requiredAtValue) : null;
  if (requiredAt && Number.isNaN(requiredAt.getTime())) {
    return { error: "Choose a valid time for your order." };
  }

  const gcashSenderName = stringValue(formData, "gcashSenderName");
  const gcashNumber = stringValue(formData, "gcashNumber");
  const gcashReferenceNumber = stringValue(formData, "gcashReferenceNumber");
  if (paymentMethod === "gcash" && (!gcashSenderName || !gcashNumber || !gcashReferenceNumber)) {
    return { error: "Enter the GCash sender name, number, and reference number." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_cart: cart,
    p_contact_name: contactName,
    p_contact_phone: contactPhone,
    p_delivery_address: deliveryAddress,
    p_note_to_staff: stringValue(formData, "noteToStaff"),
    p_note_to_driver: stringValue(formData, "noteToDriver"),
    p_required_at: requiredAt?.toISOString() ?? null,
    p_payment_method: paymentMethod,
    p_order_type: orderType,
    p_delivery_area_id: orderType === "delivery" ? deliveryAreaId : null,
    p_expected_delivery_fee: orderType === "delivery" ? expectedFee : null,
    p_gcash_sender_name: gcashSenderName || null,
    p_gcash_number: gcashNumber || null,
    p_gcash_reference_number: gcashReferenceNumber || null,
  });

  if (error || !data) {
    return { error: error?.message ?? "We could not place your order. Please try again." };
  }

  redirect(`/orders/${data}?new=1`);
}
