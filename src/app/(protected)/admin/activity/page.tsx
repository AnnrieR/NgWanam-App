import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, record_type, record_id, created_at, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen w-full px-5 py-10 sm:px-8 lg:px-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Ng Wanam Food House</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Activity log</h1><p className="mt-2 text-muted-foreground">Most recent 100 operational changes.</p></div><Button render={<Link href="/admin" />} variant="outline">Administration</Button></header>
      <div className="space-y-3">{logs?.length ? logs.map((log) => {
        const actor = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
        return <Card className="border shadow-none" key={log.id}><CardContent className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="capitalize">{log.action.replaceAll("_", " ").replaceAll(":", ": ")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{log.record_type} · {actor?.full_name || actor?.email || "System"}</p></div><time className="text-sm text-muted-foreground">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.created_at))}</time></CardContent></Card>;
      }) : <Card className="border shadow-none"><CardHeader><CardTitle>No activity yet</CardTitle></CardHeader><CardContent className="text-muted-foreground">Operational changes will appear here.</CardContent></Card>}</div>
    </main>
  );
}
