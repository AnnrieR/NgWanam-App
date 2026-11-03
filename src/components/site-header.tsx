import type { RestaurantInfo } from "@/lib/restaurant";
import { SiteNav } from "@/components/site-nav";

export async function SiteHeader({ restaurant }: { restaurant: RestaurantInfo | null }) {
  return <SiteNav restaurant={restaurant} />;
}
