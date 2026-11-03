import { createClient } from "@/lib/supabase/server";

/**
 * A cart line remembers the price it was added at, but `place_order` charges
 * the catalog's *current* price. Without re-pricing, a staff price change
 * makes the checkout preview disagree with what the customer is actually
 * charged — so both the cart and the checkout price against the live catalog
 * on every render. Variants removed from the catalog fall back to the stored
 * price and are rejected by `place_order` with its own message.
 */
export async function getVariantPrices(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_menu_catalog");
  if (!Array.isArray(data)) {
    return {};
  }

  const prices: Record<string, number> = {};
  for (const row of data as Array<{ variant_id?: unknown; price?: unknown }>) {
    if (row?.variant_id == null || row?.price == null) continue;
    prices[String(row.variant_id)] = Number(row.price);
  }
  return prices;
}
