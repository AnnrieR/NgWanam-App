"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateImage } from "@/lib/validate-image";
import { managedGcashQrPath, normalizeGcashNumber } from "@/lib/gcash-settings";

export type GcashSettingsState = { error?: string };

export async function saveGcashSettings(_: GcashSettingsState, form: FormData): Promise<GcashSettingsState> {
  const { user } = await requireRole(["admin"]);
  const accountName = String(form.get("accountName") ?? "").trim();
  const accountNumber = normalizeGcashNumber(String(form.get("accountNumber") ?? ""));
  const enabled = form.get("enabled") === "on";
  const removeQr = form.get("removeQr") === "on";
  const version = String(form.get("version") ?? "");
  if (form.get("confirmed") !== "yes") return { error: "Confirm the payment details before saving." };
  if ((accountName && (accountName.length < 2 || accountName.length > 120 || /[\x00-\x1f\x7f]/.test(accountName)))
    || (accountNumber && !/^09\d{9}$/.test(accountNumber)) || (enabled && (!accountName || !accountNumber))) {
    return { error: "Enter the registered GCash account name and a valid Philippine mobile number (09XXXXXXXXX). Both are required to enable GCash." };
  }
  if (!version || Number.isNaN(Date.parse(version))) return { error: "Settings version is missing. Refresh this page before saving." };
  const files = form.getAll("qrImage").filter(entry => entry instanceof File && entry.size > 0);
  if (files.length > 1 || (files.length && removeQr)) return { error: "Choose either a replacement QR image or Remove QR, not both." };
  const file = files[0];
  const image = file instanceof File ? await validateImage(file) : null;
  if (file && !image) return { error: "QR image must be a valid PNG, JPEG or WebP smaller than 1 MB." };
  const supabase = await createClient();
  const current = await supabase.from("restaurant_settings").select("gcash_qr_path, updated_at").eq("id", true).single();
  if (current.error || !current.data) return { error: "Settings could not be loaded. Refresh and try again." };
  // Compare timestamps in the RPC as well; this early check avoids unnecessary uploads.
  if (Date.parse(current.data.updated_at) !== Date.parse(version)) return { error: "Settings changed in another tab. Refresh and review the latest details before saving." };
  let uploadedPath: string | null = null;
  if (image && file instanceof File) {
    uploadedPath = `${user.id}/${crypto.randomUUID()}.${image.type}`;
    const { error } = await supabase.storage.from("gcash-qr").upload(uploadedPath, image.bytes, { contentType: file.type });
    if (error) return { error: "QR upload failed. Existing settings were not changed." };
  }
  const { error } = await supabase.rpc("update_gcash_settings", {
    p_account_name: accountName, p_account_number: accountNumber, p_enabled: enabled,
    p_expected_updated_at: version, p_qr_path: uploadedPath, p_remove_qr: removeQr,
  });
  if (error) {
    if (uploadedPath) await supabase.storage.from("gcash-qr").remove([uploadedPath]);
    return { error: error.message.includes("settings-changed") ? "Settings changed in another tab. Refresh before saving." : "GCash settings could not be saved. Existing details were kept." };
  }
  if ((uploadedPath || removeQr) && managedGcashQrPath(current.data.gcash_qr_path)) {
    // Storage policy protects any object still referenced by the current settings.
    await supabase.storage.from("gcash-qr").remove([current.data.gcash_qr_path]);
  }
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  redirect("/admin/settings?updated=gcash");
}
