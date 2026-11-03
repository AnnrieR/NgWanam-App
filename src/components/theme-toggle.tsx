"use client";

import { Button } from "@/components/ui/button";

import { Moon, Sun } from "lucide-react";

import { useThemeMode } from "@/hooks/use-theme";
import { applyTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch shared by every app shell. The initial mode is decided by
 * the boot script before first paint, so this only reads it after hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const mode = useThemeMode();

  function toggle() {
    const next: ThemeMode = (mode ?? "light") === "dark" ? "light" : "dark";
    applyTheme(next);
  }

  const isDark = mode === "dark";

  return (
    <Button variant="ghost"
      aria-label={mode === null ? "Toggle color theme" : isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-red-400",
        className,
      )}
      title={isDark ? "Light mode" : "Dark mode"}
      type="button"
      onClick={toggle}
    >
      <span className={cn(mode === null && "invisible")} aria-hidden>
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </span>
    </Button>
  );
}
