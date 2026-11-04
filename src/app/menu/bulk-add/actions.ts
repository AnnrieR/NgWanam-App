"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { importApprovedPhoto, importFingerprint, readImportItems, type ImportGroups, type ImportOutcome } from "@/lib/menu-photo-import";
import { menuGroups, type MenuGroup } from "@/lib/approved-menu-photo";

export type PhotoImportResult = { error?: string; outcomes?: ImportOutcome[]; nextFingerprint?: string };

export async function importMenuPhoto(form: FormData): Promise<PhotoImportResult> {
  await requireRole(["admin"]);
  if (form.get("confirmed") !== "yes") return { error: "Confirm missing-items/servings-only bulk add and 15 starting stock per new serving." };
  const groups: ImportGroups = Object.fromEntries((Object.keys(menuGroups) as MenuGroup[]).map(key => [key,String(form.get(`category:${key}`) ?? "")]));
  const selectedKeys = [...new Set(form.getAll("itemKey").map(String))];
  if (!selectedKeys.length || selectedKeys.length > 5) return { error: "Bulk add runs in confirmed batches of up to 5 items. Refresh and try again." };
  const fingerprint = String(form.get("fingerprint") ?? "");
  try {
    // Inventory INSERT is deliberately not granted to browser/authenticated clients.
    // Only this confirmed, admin-authorized, fixed-dataset action may initialize it.
    const client = createAdminClient();
    const outcomes = await importApprovedPhoto(client, groups, fingerprint, selectedKeys);
    return { outcomes: outcomes.filter(row => row.message !== "Not selected. Nothing changed."), nextFingerprint: importFingerprint(await readImportItems(client)) };
  } catch (error) {
    return { error: error instanceof Error && ["Menu changed since preview.", "Menu comparison", "Choose valid existing categories", "Select at least one"].some(prefix => error.message.startsWith(prefix)) ? error.message : "Import could not be confirmed. Refresh the comparison before retrying; no existing prices or stock should be overwritten." };
  } finally {
    for (const path of ["/menu", "/menu/bulk-add", "/home", "/admin/menu", "/admin/inventory", "/staff/inventory"]) revalidatePath(path);
  }
}
