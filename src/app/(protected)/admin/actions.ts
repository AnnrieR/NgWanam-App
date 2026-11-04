"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountDeleteResult = { ok: true; warning?: string } | { ok: false; error: string; reference?: string };

function accountDeleteFailure(stage: string, error: unknown, message: string): AccountDeleteResult {
  const details = error && typeof error === "object" ? error as { code?: unknown; status?: unknown } : {};
  const code = typeof details.code === "string" && /^[a-zA-Z0-9_]{1,60}$/.test(details.code) ? details.code : "unknown";
  const reference = `account-delete/${stage}/${code}`;
  // No raw provider message, email, user ID, token or environment values in logs.
  console.error("[account-delete]", { reference, status: typeof details.status === "number" ? details.status : undefined });
  return { ok: false, error: message, reference };
}

export async function deleteAccount(formData: FormData): Promise<AccountDeleteResult> {
  const { user } = await requireRole(["admin"]);
  const profileId = String(formData.get("profileId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId) || formData.get("confirmed") !== "yes") return { ok: false, error: "Confirm the account you want to delete." };
  if (profileId === user.id) return { ok: false, error: "You cannot delete your own administrator account." };
  let admin: ReturnType<typeof createAdminClient>;
  try { admin = createAdminClient(); } catch (error) {
    return accountDeleteFailure("configuration", error, "Account deletion is not configured on the web server. Ask an administrator to check its server-only Supabase configuration.");
  }
  let stage = "prepare";
  try {
  const supabase = await createClient();
  const { error: guardError } = await supabase.rpc("admin_prepare_account_deletion", { p_profile_id: profileId });
  if (guardError) return accountDeleteFailure(stage, guardError,
    guardError.message.includes("unfinished-work") ? "Finish or cancel this account's open orders/assigned deliveries before deleting." :
      guardError.message.includes("last-admin") ? "The last active administrator cannot be deleted." :
        guardError.message.includes("account-not-found") ? "This account is already deleted or could not be found. Refresh User Management." :
          "Deletion could not be authorized. Check the web server logs and account-deletion database migration.");
  stage = "auth";
  // Supabase soft-delete permanently removes credentials while retaining the
  // UUID required by historical order/payment/delivery foreign keys.
  const { error: authError } = await admin.auth.admin.deleteUser(profileId, true);
  if (authError) return accountDeleteFailure(stage, authError, "Login deletion failed. The account is inactive, but deletion is not complete. Ask an administrator to check the Supabase Auth logs and Google identity soft-deletion migration before retrying.");
  stage = "profile";
  const { error } = await admin.from("profiles").update({
    full_name: "Deleted account", email: `deleted-${profileId}@removed.invalid`,
    phone: null, address: null, avatar_url: null, birth_date: null, gender: null,
    is_active: false, deleted_at: new Date().toISOString(),
  }).eq("id", profileId).select("id").single();
  if (error) return accountDeleteFailure(stage, error, "Login access was removed, but profile cleanup failed. The account remains inactive. Check the server logs, then retry Delete to finish.");
  stage = "avatars";
  let warning: string | undefined;
  try {
  const { data: photos, error: listError } = await admin.storage.from("avatars").list(profileId);
  if (listError) throw listError;
  if (photos?.length) {
    const { error: removeError } = await admin.storage.from("avatars").remove(photos.map(photo => `${profileId}/${photo.name}`));
    if (removeError) throw removeError;
  }
  } catch (error) {
    accountDeleteFailure(stage, error, "Avatar cleanup could not be confirmed.");
    warning = "The login and profile were deleted, but avatar cleanup still needs administrator review.";
  }
  revalidatePath("/admin/users");
  return warning ? { ok: true, warning } : { ok: true };
  } catch (error) {
    return accountDeleteFailure(stage, error, "We could not confirm account deletion. Refresh User Management before retrying. Check the web server logs using the reference below.");
  }
}

export async function createAccount(_: { error: string }, formData: FormData): Promise<{ error: string }> {
  await requireRole(["admin"]);
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!fullName || fullName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !["admin", "staff", "delivery"].includes(role) || phone.length > 30) return { error: "Enter a valid name, email, and account role." };
  if (password.length < 8 || password.length > 72 || !/[a-z]/i.test(password) || !/\d/.test(password)) return { error: "Use 8–72 characters, including a letter and a number." };
  if (password !== formData.get("confirmPassword")) return { error: "Passwords do not match." };
  let admin: ReturnType<typeof createAdminClient>;
  try { admin = createAdminClient(); } catch { return { error: "Local account creation is not configured. Contact the administrator." }; }
  // Auth's existing trigger creates a customer profile first. Only this
  // authenticated administrator changes its role; signup metadata cannot.
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (created.error || !created.data.user) return { error: "Account could not be created. The email may already be registered." };
  const id = created.data.user.id;
  const supabase = await createClient();
  const access = await supabase.rpc("admin_update_profile", { p_profile_id: id, p_role: role, p_is_active: true });
  const contact = access.error ? null : await admin.from("profiles").update({ phone: phone || null }).eq("id", id).select("id").single();
  if (access.error || !contact || contact.error) {
    const cleanup = await admin.auth.admin.deleteUser(id);
    return { error: cleanup.error ? "Account setup was incomplete. Review the new account in User Management before trying again." : "Account setup failed. Please try again." };
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin/reports");
  redirect("/admin/users?updated=created");
}

export async function updateProfile(formData: FormData) {
  const { user } = await requireRole(["admin"]);
  const profileId = String(formData.get("profileId") ?? "");
  const role = String(formData.get("role") ?? "");
  const isActive = formData.get("isActive") === "on";

  if (!profileId || !["customer", "staff", "delivery", "admin"].includes(role)) {
    redirect("/admin/users?error=invalid-profile");
  }
  if (profileId === user.id && (role !== "admin" || !isActive)) redirect("/admin/users?error=own-access");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_profile", {
    p_profile_id: profileId,
    p_role: role,
    p_is_active: isActive,
  });

  if (error) {
    redirect("/admin/users?error=update-failed");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}

function ruleValues(formData: FormData) {
  const intent = String(formData.get("intent") ?? "").trim().toLowerCase();
  const keywords = String(formData.get("keywords") ?? "").split(",").map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
  const response = String(formData.get("response") ?? "").trim();

  return { intent, keywords, response };
}

function commaSeparatedValues(value: FormDataEntryValue | null) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function httpUrl(value: FormDataEntryValue | null) {
  const url = String(value ?? "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function updateRestaurantInfo(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const operatingHours = String(formData.get("operatingHours") ?? "").trim();
  const phoneNumbers = commaSeparatedValues(formData.get("phoneNumbers"));
  const deliveryServiceAreas = commaSeparatedValues(formData.get("deliveryServiceAreas"));
  const facebookUrl = httpUrl(formData.get("facebookUrl"));

  if (!name || !address || !operatingHours || !phoneNumbers.length || !deliveryServiceAreas.length || facebookUrl === null) {
    redirect("/admin?error=invalid-restaurant-info");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_restaurant_info", {
    p_name: name,
    p_address: address,
    p_operating_hours: operatingHours,
    p_phone_numbers: phoneNumbers,
    p_facebook_url: facebookUrl,
    p_delivery_service_areas: deliveryServiceAreas,
  });
  if (error) redirect("/admin?error=restaurant-info-update-failed");

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?updated=restaurant-info");
}

export async function createChatbotRule(formData: FormData) {
  const { user } = await requireRole(["admin"]);
  const { intent, keywords, response } = ruleValues(formData);
  if (!/^[a-z0-9_-]+$/.test(intent) || !keywords.length || !response) {
    redirect("/admin/faq?error=invalid-rule");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("chatbot_rules").insert({ intent, keywords, response, updated_by: user.id });
  if (error) redirect("/admin/faq?error=rule-create-failed");

  revalidatePath("/admin/faq");
  redirect("/admin/faq?updated=rule-created");
}

export async function updateChatbotRule(formData: FormData) {
  const { user } = await requireRole(["admin"]);
  const ruleId = String(formData.get("ruleId") ?? "");
  const { intent, keywords, response } = ruleValues(formData);
  if (!ruleId || !/^[a-z0-9_-]+$/.test(intent) || !keywords.length || !response) {
    redirect("/admin/faq?error=invalid-rule");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("chatbot_rules")
    .update({ intent, keywords, response, is_active: formData.get("isActive") === "on", updated_by: user.id })
    .eq("id", ruleId).select("id").single();
  if (error) redirect("/admin/faq?error=rule-update-failed");

  revalidatePath("/admin/faq");
  redirect("/admin/faq?updated=rule-updated");
}

export async function deleteChatbotRule(formData: FormData) {
  await requireRole(["admin"]);
  const ruleId = String(formData.get("ruleId") ?? "");
  if (!ruleId || formData.get("confirmDelete") !== "on") redirect("/admin/faq?error=confirm-delete");

  const supabase = await createClient();
  const { error } = await supabase.from("chatbot_rules").delete().eq("id", ruleId).select("id").single();
  if (error) redirect("/admin/faq?error=rule-delete-failed");

  revalidatePath("/admin/faq");
  redirect("/admin/faq?updated=rule-deleted");
}

/**
 * The admin's half of menu approval. The row-level guard
 * (`private.guard_menu_approval()`) is what actually enforces the role — a
 * staff member reaching this action is rejected by the database — so all this
 * does is carry the decision through and keep the caches honest.
 */
export async function setMenuApproval(formData: FormData) {
  const menuItemId = String(formData.get("menuItemId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!menuItemId || (decision !== "approved" && decision !== "rejected")) {
    redirect("/admin/menu?error=invalid-decision");
  }

  const supabase = await createClient();
  // Rejecting also takes the item off the menu: `place_order` re-checks
  // `mi.is_active`, so an item refused here cannot slip through from a cart
  // that still holds it. Approving puts it straight back on sale.
  const { error } = await supabase
    .from("menu_items")
    .update({ approval_status: decision, is_active: decision === "approved" })
    .eq("id", menuItemId);

  if (error) {
    redirect(
      error.message.includes("Only an admin")
        ? "/admin/menu?error=admins-only"
        : "/admin/menu?error=decision-failed",
    );
  }

  revalidatePath("/menu");
  revalidatePath("/admin/menu");
  redirect(`/admin/menu?updated=${decision}`);
}
