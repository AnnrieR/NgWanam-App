/** Read the effective Auth setting, not a potentially stale web-service flag. */
export async function emailConfirmationRequired() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const settings = await response.json();
    return settings.mailer_autoconfirm === false;
  } catch { return false; }
}

export function registrationCallbackUrl() {
  const url = new URL(process.env.AUTH_SITE_URL ?? "");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("Invalid AUTH_SITE_URL");
  }
  return `${url.origin}/auth/confirm?next=/home`;
}
