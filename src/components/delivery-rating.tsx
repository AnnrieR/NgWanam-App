import { createClient } from "@/lib/supabase/server";
import { DeliveryRatingForm } from "@/components/delivery-rating-form";

export async function DeliveryRating({ orderId }: { orderId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_delivery_rating_context", { p_order_id: orderId });
  if (error) return <p className="mt-4 text-xs text-muted-foreground">Rider rating information is temporarily unavailable. Refresh to try again.</p>;
  const context = Array.isArray(data) ? data[0] : null;
  if (!context) return null;
  return <DeliveryRatingForm orderId={orderId} riderName={context.rider_name} existingRating={context.rating} existingComment={context.comment} canRate={context.can_rate} />;
}
