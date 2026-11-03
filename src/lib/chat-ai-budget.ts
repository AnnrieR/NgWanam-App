import "server-only";

import { createClient } from "@supabase/supabase-js";

/** Only this budget RPC uses the service role. Business reads use user RLS. */
export async function reserveChatAiAttempt(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const budget = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data, error } = await budget.rpc("consume_chatbot_ai_budget", { p_user_id: userId });
    return !error && data === true;
  } catch { return false; }
}
