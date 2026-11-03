export type CartItem = {
  variant_id: string;
  item_name: string;
  variant_name: string;
  price: number;
  available_stock: number;
  quantity: number;
};

export const cartStorageKey = "ng-wanam-cart";

/**
 * `storage` only fires in *other* tabs, so same-tab listeners (header badge,
 * cart page, checkout) rely on this custom event instead.
 */
export const cartChangeEvent = "ng-wanam-cart-change";

export function readCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(cartStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    clearCart();
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  try {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
  } catch {
    // Private browsing can block storage; the in-memory cart still works.
  }
  window.dispatchEvent(new Event(cartChangeEvent));
}

export function clearCart() {
  try {
    window.localStorage.removeItem(cartStorageKey);
  } catch {
    // Ignore storage failures.
  }
}

/** Result of re-validating a past order against the live catalog. */
export type ReorderResult = {
  error?: string;
  items?: CartItem[];
  unavailable?: string[];
};
