import type { SupabaseClient } from "@supabase/supabase-js";

const legacyMenuSelect = "id, name, description, image_url, category_id, is_best_seller, requires_preorder, is_active, approval_status, categories(id, name), menu_variants(id, name, serving_label, price, is_active)";
const currentMenuSelect = legacyMenuSelect.replace("price, is_active)", "price, is_active, retired_at)");

/** Retry only a known missing retirement column, never permission/network errors. */
export function missingServingRetirementColumn(error: { code?: string; message?: string; details?: string } | null) {
  return !!error && ["42703", "PGRST204"].includes(error.code ?? "") &&
    /\bretired_at\b/i.test(`${error.message ?? ""} ${error.details ?? ""}`);
}

export async function loadMenuWithCompatibility(client: Pick<SupabaseClient, "from">) {
  const current = await client.from("menu_items").select(currentMenuSelect).order("name");
  if (!missingServingRetirementColumn(current.error)) {
    return { ...current, servingDeletionAvailable: !current.error };
  }
  const legacy = await client.from("menu_items").select(legacyMenuSelect).order("name");
  return { ...legacy, servingDeletionAvailable: false };
}
