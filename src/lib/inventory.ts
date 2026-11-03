import type { SupabaseClient } from "@supabase/supabase-js";
import { one } from "@/lib/embedded";

export type InventoryRow = {
  id: string; item: string; category: string; variant: string; serving: string; price: number;
  current: number; reserved: number; minimum: number; isActive: boolean; updatedAt: string;
};

export function stockStatus(row: Pick<InventoryRow, "current" | "reserved" | "minimum">) {
  const sellable = row.current - row.reserved;
  return sellable <= 0 ? "out" : sellable <= row.minimum ? "low" : "ok";
}

export async function loadInventory(client: SupabaseClient): Promise<InventoryRow[]> {
  const rows: InventoryRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("inventory")
      .select("id, current_stock, reserved_stock, minimum_stock, updated_at, menu_variants(id, name, serving_label, price, is_active, menu_items(name, is_active, approval_status, categories(name)))")
      .order("id").range(offset, offset + 499);
    if (error) throw new Error("Inventory could not be loaded.");
    for (const record of data ?? []) {
      const variant = one(record.menu_variants);
      const item = one(variant?.menu_items);
      if (!variant || !item) continue;
      rows.push({ id: record.id, item: item.name ?? "Unnamed item", category: one(item.categories)?.name ?? "Uncategorized",
        variant: variant.name, serving: variant.serving_label ?? "Serving", price: Number(variant.price),
        current: record.current_stock, reserved: record.reserved_stock, minimum: record.minimum_stock,
        isActive: Boolean(variant.is_active && item.is_active && item.approval_status === "approved"), updatedAt: record.updated_at });
    }
    if (!data || data.length < 500) break;
  }
  return rows.sort((a, b) => a.item.localeCompare(b.item) || a.variant.localeCompare(b.variant));
}
