"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { validateImage } from "@/lib/validate-image";
import { requireRole } from "@/lib/auth";
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const ALLOWED_GENDERS = new Set(["female", "male", "non_binary", "prefer_not_to_say"]);

export async function updateAccount(formData: FormData) {
  const { user, profile } = await requireRole(["customer", "staff", "delivery", "admin"]);
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const removeAvatar = formData.get("removeAvatar") === "on";
  const avatar = formData.get("avatar");

  if (!fullName || fullName.length > 120 || phone.length > 32 || address.length > 240) {
    redirect("/account?error=invalid-details");
  }
  if (gender && !ALLOWED_GENDERS.has(gender)) {
    redirect("/account?error=invalid-details");
  }
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    redirect("/account?error=invalid-details");
  }
  if (birthDate) {
    const parsed = new Date(`${birthDate}T00:00:00`);
    const today = new Date();
    const oldest = new Date("1900-01-01T00:00:00");
    if (Number.isNaN(parsed.getTime()) || parsed > today || parsed < oldest) {
      redirect("/account?error=invalid-birthdate");
    }
  }

  const supabase = await createClient();
  let uploadedPath: string | null = null;

  const patch: Record<string, string | null> = {
    full_name: fullName,
    phone: phone || null,
    address: address || null,
    birth_date: birthDate || null,
    gender: gender || null,
  };

  if (removeAvatar) {
    patch.avatar_url = null;
  } else if (avatar instanceof File && avatar.size > 0) {
    const extension = ALLOWED_AVATAR_TYPES[avatar.type];
    const image = await validateImage(avatar, true);
    if (!extension || !image) {
      redirect("/account?error=avatar-invalid");
    }

    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, image.bytes, { contentType: avatar.type });
    if (uploadError) redirect("/account?error=upload-failed");
    uploadedPath = path;

    const { data: uploaded } = supabase.storage.from("avatars").getPublicUrl(path);
    patch.avatar_url = uploaded.publicUrl;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    if (uploadedPath) await supabase.storage.from("avatars").remove([uploadedPath]);
    redirect("/account?error=update-failed");
  }
  if ((removeAvatar || uploadedPath) && profile.avatar_url) {
    const base = supabase.storage.from("avatars").getPublicUrl("").data.publicUrl;
    if (profile.avatar_url.startsWith(base)) {
      const oldPath = profile.avatar_url.slice(base.length);
      if (oldPath.startsWith(`${user.id}/`)) await supabase.storage.from("avatars").remove([oldPath]);
    }
  }

  revalidatePath("/account");
  redirect("/account?updated=1");
}
