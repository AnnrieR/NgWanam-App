"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveDeliveryArea(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const fee = String(formData.get("fee") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  if (formData.get("confirmed") !== "yes" || name.length < 2 || name.length > 160 || /[\x00-\x1f\x7f]/.test(name)
    || !/^\d{1,8}(\.\d{1,2})?$/.test(fee) || Number(fee) > 99999999.99
    || (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    redirect("/admin/delivery-areas?error=invalid");
  }
  const supabase = await createClient();
  const values = { name, fee: Number(fee), is_active: isActive, source: "Admin-managed delivery area" };
  const result = id
    ? await supabase.from("delivery_areas").update(values).eq("id", id).select("id").maybeSingle()
    : await supabase.from("delivery_areas").insert(values).select("id").single();
  if (result.error || !result.data) redirect(`/admin/delivery-areas?error=${result.error?.code === "23505" ? "duplicate" : "save"}`);
  revalidatePath("/admin/delivery-areas");
  revalidatePath("/checkout");
  redirect("/admin/delivery-areas?updated=1");
}

export async function deleteDeliveryArea(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  if (formData.get("confirmDelete") !== "yes" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    redirect("/admin/delivery-areas?error=confirm-delete");
  }
  const supabase = await createClient();
  // FK RESTRICT prevents deletion of any location referenced by an order,
  // including concurrent checkouts. Never detach or rewrite historical orders.
  const { data, error } = await supabase.from("delivery_areas").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect(`/admin/delivery-areas?error=${error?.code === "23503" ? "location-used" : "delete"}`);
  revalidatePath("/admin/delivery-areas");
  revalidatePath("/checkout");
  redirect("/admin/delivery-areas?updated=deleted");
}
