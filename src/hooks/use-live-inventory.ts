"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadInventory, type InventoryRow } from "@/lib/inventory";

/** Realtime updates with a 15-second polling fallback; never clear good data on a failed refresh. */
export function useLiveInventory(initialRows?: InventoryRow[]) {
  const [rows, setRows] = useState<InventoryRow[]>(initialRows ?? []);
  const [loading, setLoading] = useState(!initialRows);
  const [error, setError] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    const client = createClient();
    let disposed = false, fetching = false, queued = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    async function fetchRows() {
      if (disposed || document.hidden) return;
      if (fetching) { queued = true; return; }
      fetching = true;
      try {
        const next = await loadInventory(client);
        if (!disposed) { setRows(next); setError(false); setCheckedAt(new Date().toISOString()); }
      } catch {
        if (!disposed) setError(true);
      } finally {
        fetching = false;
        if (!disposed) { setLoading(false); if (queued) { queued = false; void fetchRows(); } }
      }
    }
    refreshRef.current = () => void fetchRows();
    const schedule = () => { clearTimeout(debounce); debounce = setTimeout(() => void fetchRows(), 250); };
    const channel = client.channel(`inventory-alerts-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, schedule).subscribe();
    const timer = setInterval(() => void fetchRows(), 15000);
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("focus", schedule);
    void fetchRows();
    return () => { disposed = true; refreshRef.current = () => {}; clearInterval(timer); clearTimeout(debounce); document.removeEventListener("visibilitychange", schedule); window.removeEventListener("focus", schedule); void client.removeChannel(channel); };
  }, []);

  return { rows, loading, error, checkedAt, refresh };
}
