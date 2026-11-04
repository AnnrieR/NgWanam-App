"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { importApprovedPhoto, type ImportOutcome } from "@/lib/menu-photo-import";

export type PhotoImportResult = { error?: string; outcomes?: ImportOutcome[] };

export async function importMenuPhoto(form: FormData): Promise<PhotoImportResult> {
  await requireRole(["admin"]);
  if (form.get("confirmed") !== "yes") return { error: "Confirm missing-items-only import and 15 starting stock per new serving." };
  const groups = { pancit: String(form.get("pancitCategory") ?? ""), chicken: String(form.get("chickenCategory") ?? "") };
  if (!groups.pancit || !groups.chicken) return { error: "Choose both categories before importing." };
  const fingerprint = String(form.get("fingerprint") ?? "");
  try {
    // Inventory INSERT is deliberately not granted to browser/authenticated clients.
    // Only this confirmed, admin-authorized, fixed-dataset action may initialize it.
    const client = createAdminClient();
    const outcomes = await importApprovedPhoto(client, groups, fingerprint, [...new Set(form.getAll("itemKey").map(String))]);
    return { outcomes };
  } catch (error) {
    return { error: error instanceof Error && ["Menu changed since preview.", "Menu comparison", "Choose valid existing categories", "Select at least one"].some(prefix => error.message.startsWith(prefix)) ? error.message : "Import could not be confirmed. Refresh the comparison before retrying; no existing prices or stock should be overwritten." };
  } finally {
    for (const path of ["/menu", "/menu/import", "/home", "/admin/menu", "/admin/inventory", "/staff/inventory"]) revalidatePath(path);
  }
}
