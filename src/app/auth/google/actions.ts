"use server";

import { createClient as createTransientClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { googleAuthEnabled, googleCallbackUrl } from "@/lib/google-auth";

export type GoogleState = { error?: string };

export async function startGoogle(_: GoogleState, form: FormData): Promise<GoogleState> {
  const linking = form.get("link") === "yes";
  if (!googleAuthEnabled()) return { error: "Google sign-in is not enabled yet. You can still use your email and password." };
  let destination: string;
  try {
    const callback = googleCallbackUrl();
    const client = await createClient();
    const { data: ready, error: guardError } = await client.rpc("google_auth_ready");
    if (guardError || ready !== true) return { error: "Google sign-in is unavailable until its security setup is complete." };
    if (linking) {
      if (form.get("consent") !== "yes") return { error: "Confirm that you want to link Google to this account." };
      const { data: { user } } = await client.auth.getUser();
      if (!user?.email) return { error: "Sign in with your existing account first." };
      const password = String(form.get("password") ?? "");
      if (!password) return { error: "Re-enter your current password." };
      // Never persist the password-check session in browser cookies/storage.
      const verifier = createTransientClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await verifier.auth.signInWithPassword({ email: user.email, password });
      if (error || data.user?.id !== user.id) return { error: "Unable to verify your password. Try again or use password recovery." };
      try {
        const { error: approvalError } = await verifier.rpc("approve_google_link");
        if (approvalError) return { error: "Linking requires an active, confirmed account without an existing Google link." };
      } finally {
        await verifier.auth.signOut({ scope: "local" });
      }
      const { data: link, error: linkError } = await client.auth.linkIdentity({ provider: "google", options: {
        redirectTo: callback, queryParams: { prompt: "select_account", login_hint: user.email },
      } });
      if (linkError || !link.url) return { error: "Unable to start Google linking. Please try again." };
      destination = link.url;
    } else {
      const { data: { user } } = await client.auth.getUser();
      if (user) return { error: "You are already signed in. Use Account security to link Google." };
      const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options: {
        redirectTo: callback, queryParams: { prompt: "select_account" },
      } });
      if (error || !data.url) return { error: "Unable to start Google sign-in. Please try again." };
      destination = data.url;
    }
    (await cookies()).set("ng-google-flow", linking ? "link" : "login", {
      httpOnly: true, sameSite: "lax", secure: callback.startsWith("https:"), path: "/auth/google/callback", maxAge: 300,
    });
  } catch {
    return { error: "Google authentication is unavailable right now. Please try again later." };
  }
  redirect(destination);
}
