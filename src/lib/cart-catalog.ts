import type { CartItem } from "./cart";

export type CartProduct = {
  menu_item_id: string;
  variant_id: string;
  item_name: string;
  variant_name: string;
  serving_label: string;
  description: string | null;
  image_url: string | null;
  category_name: string;
  price: number;
  available_stock: number;
  is_best_seller: boolean;
};

/** One available serving per dish, with complementary categories first. */
export function cartRecommendations(catalog: CartProduct[], cart: CartItem[], limit = 4): CartProduct[] {
  const ids = new Set(cart.map((item) => item.variant_id));
  const inCart = catalog.filter((product) => ids.has(product.variant_id));
  const dishIds = new Set(inCart.map((product) => product.menu_item_id));
  const categories = new Set(inCart.map((product) => product.category_name));
  const candidates = new Map<string, CartProduct>();
  for (const product of catalog) {
    if (ids.has(product.variant_id) || dishIds.has(product.menu_item_id) || product.available_stock < 1) continue;
    const existing = candidates.get(product.menu_item_id);
    if (!existing || Number(product.price) < Number(existing.price)) candidates.set(product.menu_item_id, product);
  }
  return [...candidates.values()].sort((a, b) =>
    Number(categories.has(a.category_name)) - Number(categories.has(b.category_name)) ||
    Number(b.is_best_seller) - Number(a.is_best_seller) ||
    Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)) ||
    a.item_name.localeCompare(b.item_name),
  ).slice(0, limit);
}

/** Returns null rather than exceeding live stock, including existing quantities. */
export function addCartRecommendation(cart: CartItem[], product: CartProduct): CartItem[] | null {
  const existing = cart.find((item) => item.variant_id === product.variant_id);
  if ((existing?.quantity ?? 0) >= product.available_stock) return null;
  if (existing) return cart.map((item) => item.variant_id === product.variant_id ? {
    ...item, quantity: item.quantity + 1, price: Number(product.price), available_stock: product.available_stock,
  } : item);
  return [...cart, {
    variant_id: product.variant_id, item_name: product.item_name, variant_name: product.variant_name,
    price: Number(product.price), available_stock: product.available_stock, quantity: 1,
  }];
}
