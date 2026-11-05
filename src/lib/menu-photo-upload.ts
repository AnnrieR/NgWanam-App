import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { createClient } from "@/lib/supabase/server";
import { matchMenuPhotos, menuPhotoAssets, type PhotoMenuRow } from "@/lib/menu-photo-matching";
import { validateImage } from "@/lib/validate-image";

type Client = Awaited<ReturnType<typeof createClient>>;
export type PhotoUploadResult = { ok: boolean; message: string };

export async function readPhotoMenuRows(client: Client): Promise<PhotoMenuRow[]> {
  const rows: PhotoMenuRow[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await client.from("menu_items").select("id, name, image_url, approval_status").order("id").range(offset, offset + 199);
    if (error || !data) throw Error("Menu could not be read. Nothing was uploaded.");
    rows.push(...data);
    if (data.length < 200) return rows;
  }
}

/** Called only after admin authorization; client-supplied paths/URLs are never read. */
export async function uploadMatchedMenuPhoto(client: Client, key: string, expectedItemId: string): Promise<PhotoUploadResult> {
  const asset = menuPhotoAssets.find(photo => photo.key === key);
  if (!asset) return { ok: false, message: "Unknown photo. Refresh the preview." };
  const rows = await readPhotoMenuRows(client);
  const match = matchMenuPhotos(rows).find(photo => photo.key === key);
  if (match?.status !== "ready" || match.itemId !== expectedItemId) return { ok: false, message: "Menu changed or photo already exists. Refresh the preview; nothing was overwritten." };

  const bytes = await readFile(join(process.cwd(), "public", "prepared-menu-photos", `${asset.key}.webp`));
  if (bytes.length !== asset.bytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256 ||
    !await validateImage(new File([new Uint8Array(bytes)], "menu.webp", { type: "image/webp" }))) {
    return { ok: false, message: "Prepared photo validation failed. Nothing was uploaded." };
  }
  const storage = client.storage.from("menu-photos");
  // A new object per attempt avoids overwriting existing objects or concurrent runs.
  const path = `${randomUUID()}.webp`;
  const { error: uploadError } = await storage.upload(path, bytes, { contentType: "image/webp", upsert: false });
  if (uploadError) return { ok: false, message: "Storage upload failed. Database photo was not changed." };
  const url = storage.getPublicUrl(path).data.publicUrl;
  // Compare-and-set protects an image set by another admin after this preview.
  // Names/approval are also checked again at write time. Only image_url is updated.
  let update = client.from("menu_items").update({ image_url: url }).eq("id", match.itemId).eq("name", match.itemName!).eq("approval_status", "approved");
  const row = rows.find(item => item.id === match.itemId);
  update = row?.image_url === "" ? update.eq("image_url", "") : update.is("image_url", null);
  const { data, error } = await update.select("id");
  if (error || !data) {
    // A transport failure may follow a committed write: do NOT delete the object.
    return { ok: false, message: "Database save could not be confirmed. Refresh before retrying. Uploaded object was retained safely." };
  }
  if (data.length !== 1) {
    const { error: cleanupError } = await storage.remove([path]);
    return { ok: false, message: `Item changed during upload; existing photo was preserved.${cleanupError ? " Unused upload cleanup needs administrator review." : ""}` };
  }
  return { ok: true, message: `Saved photo for ${match.itemName}.` };
}
