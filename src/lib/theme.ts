export type ThemeMode = "light" | "dark";

/** Kept in sync with the inline boot script in `src/app/layout.tsx`. */
export const themeStorageKey = "ng-wanam-theme";

/** Fired in this tab whenever the mode changes, so `useSyncExternalStore` subscribers refresh. */
export const themeChangeEvent = "ng-wanam-theme-change";

export function readTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  try {
    window.localStorage.setItem(themeStorageKey, mode);
  } catch {
    // Storage can be blocked in private browsing; the session still toggles.
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener(themeChangeEvent, onStoreChange);
  return () => window.removeEventListener(themeChangeEvent, onStoreChange);
}

export function themeServerSnapshot(): ThemeMode | null {
  return null;
}
