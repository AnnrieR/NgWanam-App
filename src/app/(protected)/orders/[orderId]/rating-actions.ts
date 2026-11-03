"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateOrderViews } from "@/lib/revalidate-order-views";

export type RatingState = { error?: string; saved?: boolean };

export async function submitDeliveryRating(_previous: RatingState, formData: FormData): Promise<RatingState> {
  await requireRole(["customer"]);
  const orderId = String(formData.get("orderId") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !Number.isInteger(rating) || rating<1 || rating>5 || comment.length>500) return { error: "Choose 1–5 stars and keep your comment within 500 characters." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_delivery_rating", { p_order_id: orderId, p_rating: rating, p_comment: comment || null });
  if (error) return { error: error.message.includes("already been rated") ? "You have already rated this delivery." : "Rating could not be saved. Only your own delivered order can be rated once. Refresh and check its status." };
  revalidateOrderViews(orderId);
  return { saved: true };
}
