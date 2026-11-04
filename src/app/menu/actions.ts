"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { validateImage } from "@/lib/validate-image";

// Saves return inline results instead of navigating/remounting the menu table.
// Delete retains its existing confirmed redirect flow.
const back = "/menu";

type Client = Awaited<ReturnType<typeof createClient>>;
export type MenuSaveResult = { ok: true; message: string } | { ok: false; error: string };
type UploadedImage = { path: string; url: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function priceOf(form: FormData) {
  const value = String(form.get("price") ?? "").trim();
  return value ? Number(value) : NaN;
}

function refreshMenu() {
  revalidatePath(back);
  revalidatePath("/home");
  revalidatePath("/admin/menu");
  revalidatePath("/checkout");
}

async function uploadImage(supabase: Client, form: FormData): Promise<{ ok: true; image: UploadedImage | null } | { ok: false; error: string }> {
  const entries = form.getAll("image").filter((entry) => entry instanceof File && entry.size > 0);
  if (entries.length > 1) return { ok: false, error: "Choose exactly one JPG, PNG, or WebP image, smaller than 1 MB." };
  const file = entries[0];
  if (!(file instanceof File)) return { ok: true, image: null };
  const image = await validateImage(file);
  if (!image) return { ok: false, error: "Choose a valid JPG, PNG, or WebP image, smaller than 1 MB." };
  const { bytes, type } = image;
  const path = `${crypto.randomUUID()}.${type}`;
  const { error } = await supabase.storage.from("menu-photos").upload(path, bytes, { contentType: file.type });
  if (error) return { ok: false, error: "The image could not be uploaded. Your form has been kept; please try again." };
  return { ok: true, image: { path, url: supabase.storage.from("menu-photos").getPublicUrl(path).data.publicUrl } };
}

async function removeUploadedImage(supabase: Client, url: string | null) {
  if (!url) return;
  const base = supabase.storage.from("menu-photos").getPublicUrl("").data.publicUrl;
  if (url.startsWith(base)) {
    const path = url.slice(base.length);
    if (path && !path.includes("/")) await supabase.storage.from("menu-photos").remove([path]);
  }
}

export async function createMenuCategory(formData: FormData): Promise<MenuSaveResult> {
  await requireRole(["staff", "admin"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Category name is required." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_menu_category", { p_name: name });
  if (error) return { ok: false, error: "The category could not be created. Check whether that name already exists." };

  refreshMenu();
  return { ok: true, message: "Category created successfully." };
}

export async function createMenuEntry(formData: FormData): Promise<MenuSaveResult> {
  const { profile } = await requireRole(["staff", "admin"]);
  const categoryId = String(formData.get("categoryId") ?? "");
  const itemName = String(formData.get("itemName") ?? "").trim();
  const variantName = String(formData.get("variantName") ?? "").trim();
  const servingLabel = String(formData.get("servingLabel") ?? "").trim();
  const price = priceOf(formData);

  if (!uuid.test(categoryId) || !itemName || !variantName || !servingLabel || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Name, category, serving, and a non-negative price are required." };
  }

  const supabase = await createClient();
  const upload = await uploadImage(supabase, formData);
  if (!upload.ok) return upload;
  const image = upload.image;
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
    return { ok: false, error: "The item could not be created. Check the category and whether that item name already exists." };
  }

  refreshMenu();
  return { ok: true, message: profile.role === "admin" ? "Menu item created successfully." : "Menu item submitted for admin approval." };
}

export async function updateMenuItem(formData: FormData): Promise<MenuSaveResult> {
  await requireRole(["staff", "admin"]);
  const menuItemId = String(formData.get("menuItemId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const itemName = String(formData.get("itemName") ?? "").trim();

  if (!uuid.test(menuItemId) || !uuid.test(categoryId) || !itemName) {
    return { ok: false, error: "A valid item, category, and item name are required." };
  }

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase.from("menu_items").select("image_url").eq("id", menuItemId).single();
  if (readError || !existing) return { ok: false, error: "That item could not be read. It may have been removed; refresh the list before trying again." };
  const upload = await uploadImage(supabase, formData);
  if (!upload.ok) return upload;
  const image = upload.image;
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
    .eq("id", menuItemId)
    .select("id")
    .single();

  if (error) {
    await removeUploadedImage(supabase, image?.url ?? null);
    return { ok: false, error: "The item could not be saved. Check the category and whether that name is already in use." };
  }
  if (image) await removeUploadedImage(supabase, existing.image_url);

  refreshMenu();
  return { ok: true, message: "Changes saved." };
}

export async function createMenuVariant(formData: FormData): Promise<MenuSaveResult> {
  await requireRole(["staff", "admin"]);
  const menuItemId = String(formData.get("menuItemId") ?? "");
  const variantName = String(formData.get("variantName") ?? "").trim();
  const servingLabel = String(formData.get("servingLabel") ?? "").trim();
  const price = priceOf(formData);

  if (!uuid.test(menuItemId) || !variantName || !servingLabel || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Serving name, label, and a non-negative price are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_menu_variant", {
    p_menu_item_id: menuItemId,
    p_name: variantName,
    p_serving_label: servingLabel,
    p_price: price,
  });

  if (error) return { ok: false, error: "The serving size could not be added. Check whether that serving already exists." };

  refreshMenu();
  return { ok: true, message: "Serving size added successfully." };
}

export async function updateMenuVariant(formData: FormData): Promise<MenuSaveResult> {
  await requireRole(["staff", "admin"]);
  const variantId = String(formData.get("variantId") ?? "");
  const price = priceOf(formData);
  const name = String(formData.get("variantName") ?? "").trim();
  const servingLabel = String(formData.get("servingLabel") ?? "").trim();

  if (!uuid.test(variantId) || !name || !servingLabel || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Serving name, label, and a non-negative price are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_variants")
    .update({ name, serving_label: servingLabel, price, is_active: formData.get("isActive") === "on" })
    .eq("id", variantId)
    .is("retired_at", null)
    .select("id")
    .single();

  if (error) return { ok: false, error: "The serving details and price could not be saved. Check whether that serving name is already in use." };

  refreshMenu();
  return { ok: true, message: "Serving details and price saved." };
}

export async function deleteMenuVariant(formData: FormData): Promise<MenuSaveResult> {
  await requireRole(["staff", "admin"]);
  const variantId = String(formData.get("variantId") ?? "");
  if (!uuid.test(variantId) || formData.get("confirmed") !== "yes") {
    return { ok: false, error: "Confirm which serving size you want to delete." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_menu_variant", { p_menu_variant_id: variantId });
  if (error) return { ok: false, error: "The serving could not be deleted. Refresh the menu and try again; it may already be deleted." };
  refreshMenu();
  return { ok: true, message: "Serving size deleted from the menu. Existing orders and stock history were preserved." };
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
