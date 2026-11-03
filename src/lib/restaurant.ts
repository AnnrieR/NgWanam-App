import { createClient } from "@/lib/supabase/server";

export type RestaurantInfo = {
  name: string;
  address: string;
  operating_hours: string;
  phone_numbers: string[];
  facebook_url: string | null;
  delivery_service_areas: string[];
};

export async function getRestaurantInfo(): Promise<RestaurantInfo | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_restaurant_info");
  return (Array.isArray(data) ? data[0] : null) as RestaurantInfo | null;
}
