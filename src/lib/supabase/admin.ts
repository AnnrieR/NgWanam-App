import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Privileged Auth API only. Call requireRole(["admin"]) before using it. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Account creation is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
