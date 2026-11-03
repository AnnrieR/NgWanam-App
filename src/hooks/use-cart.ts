"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { cartChangeEvent, readCart, writeCart, type CartItem } from "@/lib/cart";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(cartChangeEvent, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(cartChangeEvent, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot() {
  return JSON.stringify(readCart());
}

/** `""` while rendering on the server / during hydration. */
function getServerSnapshot() {
  return "";
}

/**
 * Live view of the localStorage cart. Writing through `save` notifies every
 * subscriber (header badge, menu, cart page) in the same tab.
 */
export function useCart() {
  const serialized = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const cart = useMemo<CartItem[]>(() => {
    if (!serialized) return [];
    try {
      const parsed: unknown = JSON.parse(serialized);
      return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      return [];
    }
  }, [serialized]);

  const save = useCallback((items: CartItem[]) => writeCart(items), []);
  const clear = useCallback(() => writeCart([]), []);

  return { cart, save, clear, isHydrated: serialized !== "" };
}
