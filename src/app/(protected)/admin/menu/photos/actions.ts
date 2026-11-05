"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uploadMatchedMenuPhoto, type PhotoUploadResult } from "@/lib/menu-photo-upload";

export async function importMenuItemPhoto(key: string, itemId: string): Promise<PhotoUploadResult> {
  await requireRole(["admin"]);
  if (typeof key !== "string" || typeof itemId !== "string" || key.length > 180 || itemId.length > 80) return { ok: false, message: "Invalid photo selection." };
  try {
    const result = await uploadMatchedMenuPhoto(await createClient(), key, itemId);
    for (const path of ["/", "/menu", "/home", "/cart", "/checkout", "/admin/menu", "/admin/menu/photos"]) revalidatePath(path);
    return result;
  } catch {
    // No secrets/provider payloads in the browser. A write may have completed.
    return { ok: false, message: "Photo import could not be confirmed. Refresh the preview before retrying." };
  }
}
