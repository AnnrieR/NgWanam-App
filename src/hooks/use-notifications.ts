"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth";

export type NotificationRow = { id: string; order_id: string; kind: string; message: string; created_at: string; read_at: string | null };

/** Recipient/role RLS protects reads; realtime is an enhancement, not a dependency. */
export function useNotifications(role: AppRole) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    const client = createClient();
    let disposed = false, fetching = false, queued = false;
    let owner: string | null = null;
    let authOwner: string | null | undefined;
    let revision = 0;
    let channel: ReturnType<typeof client.channel> | null = null;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => { clearTimeout(debounce); debounce = setTimeout(() => void fetchRows(), 200); };
    async function fetchRows() {
      if (disposed || document.hidden) return;
      if (fetching) { queued = true; return; }
      fetching = true;
      const startedRevision = revision;
      try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (disposed || startedRevision !== revision) return;
        if (authError || !user) throw new Error("Not authenticated");
        if (owner !== user.id) {
          owner = user.id;
          if (!disposed) { setRows([]); setUnread(0); }
          if (channel) void client.removeChannel(channel);
          channel = client.channel(`notifications-${crypto.randomUUID()}`).on("postgres_changes", {
            event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}`,
          }, schedule).subscribe();
        }
        const [list, count] = await Promise.all([
          client.from("notifications").select("id,order_id,kind,message,created_at,read_at").eq("recipient_id",user.id).eq("recipient_role",role).order("created_at",{ascending:false}).order("id").limit(50),
          client.from("notifications").select("id",{count:"exact",head:true}).eq("recipient_id",user.id).eq("recipient_role",role).is("read_at",null),
        ]);
        if (list.error || count.error) throw new Error("Alerts unavailable");
        if (!disposed && startedRevision === revision) { setRows(list.data ?? []); setUnread(count.count ?? 0); setError(false); }
      } catch {
        if (!disposed && startedRevision === revision) setError(true);
      } finally {
        fetching = false;
        if (!disposed) { setLoading(false); if (queued) { queued=false; void fetchRows(); } }
      }
    }
    refreshRef.current = () => void fetchRows();
    const { data: auth } = client.auth.onAuthStateChange((_event, session) => {
      const nextOwner = session?.user.id ?? null;
      if (authOwner !== nextOwner) { authOwner=nextOwner; revision++; owner=null; setRows([]); setUnread(0); }
      schedule();
    });
    const timer = setInterval(() => void fetchRows(),15000);
    document.addEventListener("visibilitychange",schedule);
    window.addEventListener("focus",schedule);
    void fetchRows();
    return () => { disposed=true; refreshRef.current=()=>{}; clearInterval(timer); clearTimeout(debounce); auth.subscription.unsubscribe(); document.removeEventListener("visibilitychange",schedule); window.removeEventListener("focus",schedule); if(channel) void client.removeChannel(channel); };
  }, [role]);

  async function markRead(id?: string) {
    if (saving) return;
    setSaving(true);
    try {
      const { error: mutationError } = await createClient().rpc("mark_notifications_read", { p_notification_id: id ?? null });
      if (mutationError) throw mutationError;
      refresh();
    } catch { setError(true); }
    finally { setSaving(false); }
  }
  return { rows, unread, loading, error, saving, refresh, markRead };
}
