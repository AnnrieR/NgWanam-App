"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationFeedback() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const start = () => {
      if (timer.current) clearTimeout(timer.current);
      startedAt.current = Date.now();
      setLoading(true);
      // Recover if a navigation is interrupted or fails without changing routes.
      timer.current = setTimeout(() => setLoading(false), 30000);
    };
    window.addEventListener("ng-wanam-navigation-start", start);
    return () => {
      window.removeEventListener("ng-wanam-navigation-start", start);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!startedAt.current) return;
    if (timer.current) clearTimeout(timer.current);
    // A cached page can arrive immediately; keep feedback visible without
    // delaying the navigation or the page's data request.
    timer.current = setTimeout(() => {
      setLoading(false);
      startedAt.current = 0;
    }, Math.max(0, 500 - (Date.now() - startedAt.current)));
  }, [pathname]);

  if (!loading) return null;
  return <div role="status" aria-label="Loading page" className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-white/60 backdrop-blur-[2px] dark:bg-slate-950/60">
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><LoaderCircle aria-hidden="true" className="size-6 animate-spin text-red-600 motion-reduce:animate-none" />Loading...</div>
  </div>;
}
