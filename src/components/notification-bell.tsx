"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNotifications } from "@/hooks/use-notifications";
import type { AppRole } from "@/lib/auth";

const date = (value: string) => new Intl.DateTimeFormat("en-PH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Manila"}).format(new Date(value));

export function NotificationBell({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const { rows, unread, loading, error, saving, refresh, markRead } = useNotifications(role);
  return <>
    <Button type="button" variant="ghost" size="icon" className="relative shrink-0" aria-label={`Notifications${loading ? ", loading" : `, ${unread} unread`}${error ? ", refresh unavailable" : ""}`} onClick={() => { setOpen(true); refresh(); }}>
      <Bell aria-hidden="true" className="size-5" />{unread>0 && <span data-notification-count className="absolute -top-1 -right-1 min-w-5 rounded-full bg-red-600 px-1 text-[10px] leading-5 text-white">{unread>99 ? "99+" : unread}</span>}{error && <span className="absolute right-0 bottom-0 size-2 rounded-full bg-amber-500" />}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] gap-4 overflow-hidden sm:max-w-lg">
      <div className="pr-8"><DialogTitle>Notifications</DialogTitle><DialogDescription>Order and delivery updates · {unread} unread. Latest 50 alerts shown, newest first.</DialogDescription></div>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={loading || saving || !unread} onClick={() => void markRead()}><CheckCheck aria-hidden="true" className="size-4" />Mark all as read</Button><Button type="button" size="sm" variant="outline" onClick={refresh}><RefreshCw aria-hidden="true" className="size-4" />Refresh alerts</Button></div>
      {error && <p role="alert" className="text-xs text-amber-800 dark:text-amber-300">Alerts could not be refreshed or marked read. Showing the last loaded data; try Refresh alerts.</p>}
      <p className="text-[10px] text-muted-foreground">Updates refresh automatically while this tab is open. Opening this panel does not mark alerts as read. Times are Philippine time.</p>
      <div className="max-h-[50dvh] space-y-2 overflow-y-auto pr-1" aria-label="Notification list">
        {loading ? <p role="status" className="p-5 text-sm text-muted-foreground">Loading alerts…</p> : !rows.length ? <p role="status" className="p-5 text-sm text-muted-foreground">{error ? "No alerts could be loaded." : "No notifications yet. New order and delivery updates will appear here."}</p> : rows.map(row => <article key={row.id} data-notification-id={row.id} className={`rounded-xl border p-3 ${row.read_at ? "bg-muted/20" : "border-orange-500/40 bg-orange-500/5"}`}>
          <p className="text-sm leading-6 [overflow-wrap:anywhere]">{!row.read_at && <span className="mr-2 inline-block size-2 rounded-full bg-red-600" aria-label="Unread" />}{row.message}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{date(row.created_at)} PHT · {row.read_at ? "Read" : "Unread"}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" render={<Link href={role === "delivery" ? "/delivery/orders" : `/orders/${row.order_id}`} onClick={() => setOpen(false)} />}>{role === "delivery" ? "Open Deliveries" : "View order"}</Button>{!row.read_at && <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void markRead(row.id)}>Mark as read</Button>}</div>
        </article>)}
      </div>
    </DialogContent></Dialog>
  </>;
}
