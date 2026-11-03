"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=invalid-email");

  const origin = (await headers()).get("origin");
  const supabase = await createClient().catch(() => null);
  if (!supabase) redirect("/forgot-password?error=send-failed");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/auth/confirm?next=/update-password` : undefined,
  });

  if (error) redirect("/forgot-password?error=send-failed");
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8 || password !== confirmPassword) {
    redirect("/update-password?error=invalid-password");
  }

  const supabase = await createClient().catch(() => null);
  if (!supabase) redirect("/update-password?error=update-failed");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/update-password?error=update-failed");

  await supabase.auth.signOut();
  redirect("/login?reset=1");
}
