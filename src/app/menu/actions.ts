"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { validateImage } from "@/lib/validate-image";

/**
 * The Menu tab is a CRUD table, so every action lands back on `/menu` with a
 * one-line status in the query string rather than on a dashboard.
 */
const back = "/menu";

type Client = Awaited<ReturnType<typeof createClient>>;

async function uploadImage(supabase: Client, form: FormData) {
  const entries = form.getAll("image").filter((entry) => entry instanceof File && entry.size > 0);
  if (entries.length > 1) redirect(`${back}?error=image-invalid`);
  const file = entries[0];
  if (!(file instanceof File)) return null;
  const image = await validateImage(file);
  if (!image) redirect(`${back}?error=image-invalid`);
  const { bytes, type } = image;
  const path = `${crypto.randomUUID()}.${type}`;
  const { error } = await supabase.storage.from("menu-photos").upload(path, bytes, { contentType: file.type });
  if (error) redirect(`${back}?error=image-upload-failed`);
  return { path, url: supabase.storage.from("menu-photos").getPublicUrl(path).data.publicUrl };
}

async function removeUploadedImage(supabase: Client, url: string | null) {
  if (!url) return;
  const base = supabase.storage.from("menu-photos").getPublicUrl("").data.publicUrl;
  if (url.startsWith(base)) {
    const path = url.slice(base.length);
    if (path && !path.includes("/")) await supabase.storage.from("menu-photos").remove([path]);
  }
}

export async function createMenuCategory(formData: FormData) {
  await requireRole(["staff", "admin"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`${back}?error=invalid-category`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_menu_category", { p_name: name });
  if (error) redirect(`${back}?error=category-create-failed`);

  revalidatePath(back);
  redirect(`${back}?updated=category-created`);
}

export async function createMenuEntry(formData: FormData) {
  await requireRole(["staff", "admin"]);
  const categoryId = String(formData.get("categoryId") ?? "");
  const itemName = String(formData.get("itemName") ?? "").trim();
  const variantName = String(formData.get("variantName") ?? "").trim();
  const servingLabel = String(formData.get("servingLabel") ?? "").trim();
  const price = Number(formData.get("price"));

  if (!categoryId || !itemName || !variantName || !servingLabel || !Number.isFinite(price) || price < 0) {
    redirect(`${back}?error=invalid-entry`);
  }

  const supabase = await createClient();
  const image = await uploadImage(supabase, formData);
  const { error } = await supabase.rpc("create_menu_entry", {
    p_category_id: categoryId,
    p_item_name: itemName,
    p_description: String(formData.get("description") ?? "").trim() || null,
    p_image_url: image?.url ?? null,
    p_is_best_seller: formData.get("isBestSeller") === "on",
    p_requires_preorder: formData.get("requiresPreorder") === "on",
    p_variant_name: variantName,
    p_serving_label: servingLabel,
    p_price: price,
  });

  if (error) {
    await removeUploadedImage(supabase, image?.url ?? null);
    redirect(`${back}?error=create-failed`);
  }

  revalidatePath(back);
  redirect(`${back}?updated=created`);
}

export async function updateMenuItem(formData: FormData) {
  await requireRole(["staff", "admin"]);
  const menuItemId = String(formData.get("menuItemId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const itemName = String(formData.get("itemName") ?? "").trim();

  if (!menuItemId || !categoryId || !itemName) {
    redirect(`${back}?error=invalid-item`);
  }

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase.from("menu_items").select("image_url").eq("id", menuItemId).single();
  if (readError || !existing) redirect(`${back}?error=invalid-item`);
  const image = await uploadImage(supabase, formData);
  const { error } = await supabase
    .from("menu_items")
    .update({
      category_id: categoryId,
      name: itemName,
      description: String(formData.get("description") ?? "").trim() || null,
      image_url: image?.url ?? existing.image_url,
      is_active: formData.get("isActive") === "on",
      is_best_seller: formData.get("isBestSeller") === "on",
      requires_preorder: formData.get("requiresPreorder") === "on",
    })
    .eq("id", menuItemId);

  if (error) {
    await removeUploadedImage(supabase, image?.url ?? null);
    redirect(`${back}?error=item-update-failed`);
  }
  if (image) await removeUploadedImage(supabase, existing.image_url);

  revalidatePath(back);
  redirect(`${back}?updated=item-updated`);
}

export async function createMenuVariant(formData: FormData) {
  await requireRole(["staff", "admin"]);
  const menuItemId = String(formData.get("menuItemId") ?? "");
  const variantName = String(formData.get("variantName") ?? "").trim();
  const servingLabel = String(formData.get("servingLabel") ?? "").trim();
  const price = Number(formData.get("price"));

  if (!menuItemId || !variantName || !servingLabel || !Number.isFinite(price) || price < 0) {
    redirect(`${back}?error=invalid-variant`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_menu_variant", {
    p_menu_item_id: menuItemId,
    p_name: variantName,
    p_serving_label: servingLabel,
    p_price: price,
  });

  if (error) redirect(`${back}?error=variant-create-failed`);

  revalidatePath(back);
  redirect(`${back}?updated=variant-created`);
}

export async function updateMenuVariant(formData: FormData) {
  await requireRole(["staff", "admin"]);
  const variantId = String(formData.get("variantId") ?? "");
  const price = Number(formData.get("price"));
  const name = String(formData.get("variantName") ?? "").trim();
  const servingLabel = String(formData.get("servingLabel") ?? "").trim();

  if (!variantId || !name || !servingLabel || !Number.isFinite(price) || price < 0) {
    redirect(`${back}?error=invalid-variant`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_variants")
    .update({ name, serving_label: servingLabel, price, is_active: formData.get("isActive") === "on" })
    .eq("id", variantId);

  if (error) redirect(`${back}?error=update-failed`);

  revalidatePath(back);
  redirect(`${back}?updated=variant-updated`);
}

/**
 * Hard delete. `delete_menu_item` removes inventory, variants and the item in
 * one statement, and the order history survives because its lines only lose
 * their pointer (see the 20261007170000 migration).
 */
export async function deleteMenuItem(formData: FormData) {
  await requireRole(["staff", "admin"]);
  const menuItemId = String(formData.get("menuItemId") ?? "");
  if (!menuItemId) redirect(`${back}?error=invalid-item`);

  const supabase = await createClient();
  const { data: existing } = await supabase.from("menu_items").select("image_url").eq("id", menuItemId).single();
  const { error } = await supabase.rpc("delete_menu_item", { p_menu_item_id: menuItemId });
  if (error) redirect(`${back}?error=${error.message.includes("unfinished orders") ? "delete-in-use" : "delete-failed"}`);
  await removeUploadedImage(supabase, existing?.image_url ?? null);

  revalidatePath(back);
  redirect(`${back}?updated=deleted`);
}
