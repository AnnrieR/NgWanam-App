"use client";

import { useSyncExternalStore } from "react";

import { readTheme, subscribeTheme, themeServerSnapshot, type ThemeMode } from "@/lib/theme";

/** Current mode, or `null` until the client has hydrated. */
export function useThemeMode(): ThemeMode | null {
  return useSyncExternalStore(subscribeTheme, readTheme, themeServerSnapshot);
}
