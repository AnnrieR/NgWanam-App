import "server-only";

import type { createClient } from "@/lib/supabase/server";

type SupportClient = Awaited<ReturnType<typeof createClient>>;

export async function getSupportContext(supabase: SupportClient) {
  const [menu, areas, restaurant] = await Promise.all([
    supabase.rpc("get_menu_catalog", {}, { count: "exact" })
      .select("item_name,category_name,variant_name,serving_label,price,available_stock,requires_preorder").limit(400),
    supabase.from("delivery_areas").select("name,fee", { count: "exact" }).eq("is_active", true).order("name").limit(300),
    supabase.rpc("get_restaurant_info"),
  ]);
  const menuComplete = !menu.error && Array.isArray(menu.data) && menu.count !== null && menu.count === menu.data.length;
  const areasComplete = !areas.error && areas.count !== null && areas.count === areas.data?.length;
  const info = !restaurant.error && Array.isArray(restaurant.data) ? restaurant.data[0] : null;
  return {
    asOf: new Date().toISOString(),
    menu: menuComplete ? menu.data : null,
    menuComplete,
    deliveryAreas: areasComplete ? areas.data : null,
    deliveryAreasComplete: areasComplete,
    // Explicit allowlist: no customer data, IDs, secrets, media paths or legacy
    // flat delivery-fee settings are given to the external model.
    restaurant: info ? { name: info.name, address: info.address, operatingHours: info.operating_hours, publicPhones: info.phone_numbers } : null,
    services: {
      ordering: "Shop on /home, review your cart, then checkout. Staff/Admin menu management is on /menu, not customer shopping.",
      payment: "Cash on delivery (COD) or manual GCash. GCash submission is not automatic verification. Staff verify it; the chatbot cannot.",
      fulfillment: "Delivery to a selected supported area or pick-up. Checkout validates availability, the area and current fee.",
      tracking: "Sign in as customer to view your own order status in My Orders. Delivered is not automatically Completed or Paid.",
      cancellation: "Ask about eligibility in Order Details. This assistant cannot cancel orders. Delivered orders cannot be cancelled to release consumed stock.",
      scope: "Read-only support. No external notifications, live GPS, inferred ETA, payment collection or changes through chat.",
    },
  };
}
