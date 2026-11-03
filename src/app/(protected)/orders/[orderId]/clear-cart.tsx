"use client";

import { useEffect } from "react";

import { writeCart } from "@/lib/cart";

export function ClearCart() {
  useEffect(() => {
    writeCart([]);
  }, []);

  return null;
}
