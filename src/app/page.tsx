import { createClient } from "@/lib/supabase/server";
import type { RestaurantInfo } from "@/lib/restaurant";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Gallery, type GalleryItem } from "@/components/landing/gallery";
import { Hero } from "@/components/landing/hero";
import { MenuSection } from "@/components/landing/menu-section";
import type { MenuTabGroup } from "@/components/landing/menu-tabs";
import { OrderOnline, type OrderSample } from "@/components/landing/order-online";
import { OurStory } from "@/components/landing/our-story";

export const dynamic = "force-dynamic";

type CatalogVariant = {
  category_name: string;
  category_sort_order: number;
  menu_item_id: string;
  item_name: string;
  image_url: string | null;
  price: number;
};

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function buildLandingData(variants: CatalogVariant[]) {
  const byItem = new Map<string, CatalogVariant>();
  for (const variant of variants) {
    const existing = byItem.get(variant.menu_item_id);
    if (!existing || variant.price < existing.price) byItem.set(variant.menu_item_id, variant);
  }
  const items = [...byItem.values()];

  const galleryItems: GalleryItem[] = items.slice(0, 8).map((item) => ({
    id: item.menu_item_id,
    name: item.item_name,
    category: item.category_name,
    image_url: item.image_url,
  }));

  const categoryOrder = new Map<string, number>();
  for (const variant of variants) {
    if (!categoryOrder.has(variant.category_name)) {
      categoryOrder.set(variant.category_name, variant.category_sort_order);
    }
  }
  const groups: MenuTabGroup[] = [...categoryOrder.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 6)
    .map(([name]) => ({
      name,
      items: items
        .filter((item) => item.category_name === name)
        .map((item) => ({
          id: item.menu_item_id,
          name: item.item_name,
          price: currency.format(item.price),
        })),
    }))
    .filter((group) => group.items.length > 0);

  const samples: OrderSample[] = items.slice(0, 3).map((item) => ({
    id: item.menu_item_id,
    name: item.item_name,
    price: currency.format(item.price),
  }));

  return { galleryItems, groups, samples };
}

export default async function Home() {
  let restaurant: RestaurantInfo | null = null;
  let variants: CatalogVariant[] = [];

  try {
    const supabase = await createClient();
    const [infoResult, catalogResult] = await Promise.all([
      supabase.rpc("get_restaurant_info"),
      supabase.rpc("get_menu_catalog"),
    ]);
    restaurant = (Array.isArray(infoResult.data) ? infoResult.data[0] : null) as RestaurantInfo | null;
    variants = (catalogResult.data ?? []) as CatalogVariant[];
  } catch {
    // Supabase is not configured yet — render the public landing page shell.
  }

  const { galleryItems, groups, samples } = buildLandingData(variants);

  return (
    <>
      <SiteHeader restaurant={restaurant} />
      <main>
        <Hero />
        <Gallery items={galleryItems} />
        <OurStory />
        <MenuSection groups={groups} />
        <OrderOnline samples={samples} />
      </main>
      <SiteFooter restaurant={restaurant} />
    </>
  );
}
