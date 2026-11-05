import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { registrationCallbackUrl } from "@/lib/email-registration";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Container requests can use http://0.0.0.0:3000 behind the reverse proxy.
  // Only the validated, configured public origin may receive auth redirects.
  const publicOrigin = new URL(registrationCallbackUrl()).origin;
  const failed = () => NextResponse.redirect(new URL("/login?error=confirmation-failed", publicOrigin));
  if (searchParams.has("error") || searchParams.has("error_code")) return failed();
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/account";

  if ((tokenHash && type) || code) {
    try {
      const supabase = await createClient();
      // Default GoTrue verification emails return a PKCE code; custom templates
      // may instead send a token_hash. Support both without trusting URL flags.
      const { data, error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });

      if (!error && data.user?.email_confirmed_at) {
        return NextResponse.redirect(new URL(redirectTo, publicOrigin));
      }
      if (!error) await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Supabase is not configured yet — fall through to the failed-confirmation redirect.
    }
  }

  return failed();
}
