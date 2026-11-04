import type { User } from "@supabase/supabase-js";

export function googleAuthEnabled() {
  return process.env.GOOGLE_AUTH_ENABLED === "true";
}

/** Fixed configured origin: never build OAuth redirects from request headers. */
export function googleCallbackUrl() {
  const url = new URL(process.env.AUTH_SITE_URL ?? "");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("Invalid AUTH_SITE_URL");
  }
  return `${url.origin}/auth/google/callback`;
}

export function verifiedGoogleIdentity(user: User) {
  return user.identities?.some(identity => identity.provider === "google" &&
    identity.identity_data?.email_verified === true &&
    typeof identity.identity_data?.email === "string" &&
    identity.identity_data.email.trim().toLowerCase() === user.email?.trim().toLowerCase()) === true;
}
