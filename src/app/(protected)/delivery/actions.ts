"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidateOrderViews } from "@/lib/revalidate-order-views";
import { validateImage } from "@/lib/validate-image";

export async function updateDeliveryStatus(formData: FormData) {
  const { user } = await requireRole(["delivery"]);
  const deliveryId = String(formData.get("deliveryId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");

  if (!deliveryId || !["out_for_delivery", "delivered"].includes(nextStatus)) {
    redirect("/delivery/orders?error=invalid-status");
  }

  const supabase = await createClient();
  let photoPath: string | null = null;
  if (nextStatus === "delivered") {
    // An unused chooser can arrive as an unnamed empty File or an empty string
    // after multipart/Server Action transport. Both mean no optional photo.
    // A named empty file or non-file value is invalid, not an omitted photo.
    const files = formData.getAll("proofPhoto").filter((file) => file !== "" && !(file instanceof File && file.size === 0 && file.name === ""));
    const file = files[0];
    if (files.length > 1 || (files.length === 1 && !(file instanceof File))) redirect("/delivery/orders?error=proof-invalid");
    if (file instanceof File) {
      const image = await validateImage(file);
      if (!image) redirect("/delivery/orders?error=proof-invalid");
      const { bytes, type: extension } = image;
      photoPath = `${user.id}/${deliveryId}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("delivery-proofs").upload(photoPath, bytes, { contentType: file.type });
      if (upload.error) redirect("/delivery/orders?error=proof-upload-failed");
    }
  }
  const { error } = await supabase.rpc("update_delivery_status", {
    p_delivery_id: deliveryId,
    p_next_status: nextStatus,
    p_proof_photo_path: photoPath,
  });

  if (error) {
    if (photoPath) await supabase.storage.from("delivery-proofs").remove([photoPath]);
    redirect("/delivery/orders?error=update-failed");
  }

  revalidatePath("/delivery/orders");
  revalidatePath("/staff");
  revalidatePath("/staff/orders");
  revalidatePath("/staff/delivery");
  revalidatePath("/admin/delivery");
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  const { data: delivery } = await supabase.from("deliveries").select("order_id").eq("id", deliveryId).single();
  if (delivery) revalidateOrderViews(delivery.order_id);
  // Land back on the list the button came from, not the dashboard.
  redirect("/delivery/orders?updated=1");
}
