import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleAuthEnabled, googleCallbackUrl, verifiedGoogleIdentity } from "@/lib/google-auth";
import { roleHome, type AppRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const store = await cookies();
  const flow = store.get("ng-google-flow")?.value;
  store.delete({ name: "ng-google-flow", path: "/auth/google/callback" });
  const fail = () => NextResponse.redirect(new URL(flow === "link" ? "/account/security?error=google-failed" : "/login?error=google-failed", request.url));
  if (!googleAuthEnabled() || !["login", "link"].includes(flow ?? "") || request.nextUrl.searchParams.has("error")) return fail();
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return fail();
  try {
    // PKCE code verifier is kept by @supabase/ssr in this browser's cookies.
    const client = await createClient();
    const { data: ready, error: guardError } = await client.rpc("google_auth_ready");
    if (guardError || ready !== true) return fail();
    const { data: previous } = await client.auth.getUser();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return fail();
    const { data: { user } } = await client.auth.getUser();
    if (!user || !verifiedGoogleIdentity(user) || (flow === "link" && user.id !== previous.user?.id)) {
      await client.auth.signOut({ scope: "local" });
      return fail();
    }
    const { data: profile } = await client.from("profiles").select("role,is_active").eq("id", user.id).single();
    if (!profile?.is_active) {
      await client.auth.signOut({ scope: "local" });
      return NextResponse.redirect(new URL("/login?error=account-inactive", googleCallbackUrl()));
    }
    return NextResponse.redirect(new URL(flow === "link" ? "/account/security?linked=1" : roleHome(profile.role as AppRole), googleCallbackUrl()));
  } catch {
    return fail();
  }
}
