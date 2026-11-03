import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const redirectTo = next?.startsWith("/") ? next : "/account";

  if (tokenHash && type) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

      if (!error) {
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
    } catch {
      // Supabase is not configured yet — fall through to the failed-confirmation redirect.
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation-failed", request.url));
}
