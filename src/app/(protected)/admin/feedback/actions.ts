"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FeedbackState = { error?: string; saved?: boolean };

export async function moderateFeedback(_previous: FeedbackState, form: FormData): Promise<FeedbackState> {
  await requireRole(["admin"]);
  const id = String(form.get("ratingId") ?? "");
  const decision = String(form.get("decision") ?? "");
  const quote = String(form.get("publicQuote") ?? "").trim();
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || !["approved", "private", "pending"].includes(decision)
    || (decision === "approved" && (!quote || quote.length > 500))) return { error: "Choose a valid decision and an excerpt of 1–500 characters for publication." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_rider_feedback", { p_rating_id: id, p_decision: decision, p_public_quote: decision === "approved" ? quote : null });
  if (error) return { error: "Review could not be saved. Public testimonials require customer consent, 4–5 stars, and a written comment. Refresh and try again." };
  revalidatePath("/admin/feedback");
  revalidatePath("/");
  return { saved: true };
}
