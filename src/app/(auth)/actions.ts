"use server";

import { redirect } from "next/navigation";

import { roleHome, type AppRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { emailConfirmationRequired, registrationCallbackUrl } from "@/lib/email-registration";

export type AuthFormState = {
  error?: string;
  message?: string;
};

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}
export async function signIn(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = credentials(formData);

  if (!email || !password) {
    return { error: "Enter your email address and password." };
  }

  const supabase = await createClient().catch(() => null);
  if (!supabase) {
    return { error: "Signing in is unavailable right now. Please try again later." };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return { error: "Verify your email using the confirmation link before signing in. Check your inbox and spam folder." };
    return { error: "Invalid email or password." };
  }

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Verify your email before signing in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is inactive. Please contact Ng Wanam." };
  }

  redirect(roleHome(profile.role as AppRole));
}

export async function signUp(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const { email, password } = credentials(formData);
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!fullName || !email || !password) {
    return { error: "Enter your full name, email address, and password." };
  }

  if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    return { error: "Use at least 8 characters, including a letter and a number." };
  }

  if (password !== confirmPassword) {
    return { error: "The passwords you entered do not match." };
  }

  const supabase = await createClient().catch(() => null);
  if (!supabase) {
    return { error: "Creating accounts is unavailable right now. Please try again later." };
  }
  let callbackUrl: string;
  try { callbackUrl = registrationCallbackUrl(); } catch {
    return { error: "Email verification is not configured. Please contact Ng Wanam." };
  }
  if (!await emailConfirmationRequired()) {
    return { error: "Registration is temporarily unavailable because email verification could not be confirmed. Please contact Ng Wanam." };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    return { error: "Unable to create your account. Please try again." };
  }

  if (data.session || data.user?.email_confirmed_at) {
    if (data.session) await supabase.auth.signOut({ scope: "local" });
    return { error: "Registration did not follow the required email verification flow. Please contact Ng Wanam; automatic login was blocked." };
  }

  return { message: "Check your inbox and spam folder for the verification link. Your account stays pending until you verify your email. If the email is already registered, sign in or reset your password instead." };
}
