import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { dailyOrderCounts } from "@/lib/report-order-trend";
import { BestSellersChart, OrderStatusChart, OrderVolumeTrend } from "@/components/report-charts";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default async function ReportsPage() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const startOfToday = new Date(`${today}T00:00:00+08:00`).toISOString();
  const endOfToday = new Date(Date.parse(startOfToday) + 24 * 60 * 60 * 1000).toISOString();
  const weekStart = new Date(Date.parse(startOfToday) - 6 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("orders").select("status, total", { count: "exact" }).gte("created_at", startOfToday).lt("created_at", endOfToday),
    supabase.from("inventory").select("id, current_stock, reserved_stock, minimum_stock, menu_variants(name, serving_label, menu_items(name))", { count: "exact" }),
    // Same population as User Management: retain tombstones for history,
    // but exclude them from current account totals (inactive accounts still count).
    supabase.from("profiles").select("role", { count: "exact" }).is("deleted_at", null),
    // Best sellers: servings actually sold, counted only from completed orders
    // (`!inner` drops the rows whose order does not match).
    supabase.from("order_items").select("item_name, quantity, orders!inner(status)", { count: "exact" }).eq("orders.status", "completed"),
    // Chatbot conversations live in the log the assistant writes to.
    supabase.from("chatbot_logs").select("session_id, created_at", { count: "exact" }),
    // Sales remain a summary card only, using actual completion date.
    supabase.from("orders").select("total", { count: "exact" }).eq("status", "completed").gte("completed_at", startOfToday).lt("completed_at", endOfToday),
    // New trend is order placements, regardless of payment method/status.
    supabase.from("orders").select("created_at", { count: "exact" }).gte("created_at", weekStart).lt("created_at", endOfToday),
  ]);

  // Never turn a failed or API-truncated dataset into an apparently complete report.
  if (results.some(result => result.error || result.count !== result.data?.length)) {
    return <main className="p-8"><h1 className="text-3xl font-semibold">Operations report</h1><p role="alert" className="mt-5 rounded-xl border p-5">The full report could not be loaded. Refresh to retry. Incomplete totals are not shown; if this persists, check the database connection and API row limit.</p></main>;
  }
  const [{ data: orders }, { data: inventory }, { data: profiles }, { data: sold }, { data: logs }, { data: completed }, { data: weekOrders }] = results;
  const orderDays = dailyOrderCounts(weekOrders ?? [], weekStart);

  const completedSales = (completed ?? []).reduce((sum, order) => sum + Number(order.total), 0);
  const activeOrders = orders?.filter((order) => !["completed", "cancelled"].includes(order.status)).length ?? 0;
  const lowStock = inventory?.filter((item) => item.current_stock - item.reserved_stock <= item.minimum_stock) ?? [];

  const totalUsers = profiles?.length ?? 0;
  const roleCount = (role: string) => profiles?.filter((profile) => profile.role === role).length ?? 0;
  const registeredCustomers = roleCount("customer");

  const servingsByItem = new Map<string, number>();
  for (const line of sold ?? []) {
    const name = line.item_name?.trim() || "Unnamed item";
    servingsByItem.set(name, (servingsByItem.get(name) ?? 0) + Number(line.quantity ?? 0));
  }
  const bestSellers = [...servingsByItem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);

  const logRows = logs ?? [];
  const conversations = new Set(logRows.map((row) => row.session_id)).size;
  const conversationsToday = new Set(
    logRows.filter((row) => row.created_at >= startOfToday && row.created_at < endOfToday).map((row) => row.session_id),
  ).size;

  return (
    <main className="min-h-screen w-full px-5 py-10 sm:px-8 lg:px-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Ng Wanam Food House</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Operations report</h1><p className="mt-2 text-muted-foreground">Today: {today} · Philippine time. Each chart shows its reporting period.</p></div><Button render={<Link href="/admin" />} variant="outline">Administration</Button></header>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Registered customers and users</h2>
          <span className="text-sm text-muted-foreground">{totalUsers} registered accounts</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border shadow-none"><CardHeader><CardTitle>Registered customers</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{registeredCustomers}</CardContent></Card>
          <Card className="border shadow-none"><CardHeader><CardTitle>Total users</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{totalUsers}</CardContent></Card>
          <Card className="border shadow-none"><CardHeader><CardTitle>Staff</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{roleCount("staff")}</CardContent></Card>
          <Card className="border shadow-none"><CardHeader><CardTitle>Riders</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{roleCount("delivery")}</CardContent></Card>
          <Card className="border shadow-none"><CardHeader><CardTitle>Admins</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{roleCount("admin")}</CardContent></Card>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Includes active and inactive accounts. Deleted accounts are excluded, matching User Management.</p>
      </section>

      <div className="mb-10 grid gap-4 sm:grid-cols-3"><Card className="border shadow-none"><CardHeader><CardTitle>Orders today</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{orders?.length ?? 0}</CardContent></Card><Card className="border shadow-none"><CardHeader><CardTitle>Active orders placed today</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{activeOrders}</CardContent></Card><Card className="border shadow-none"><CardHeader><CardTitle>Completed sales today</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{currency.format(completedSales)}</CardContent></Card></div>

      <section aria-label="Order charts" className="mb-10 grid gap-5 xl:grid-cols-2">
        <OrderVolumeTrend days={orderDays} />
        <OrderStatusChart statuses={(orders ?? []).map(order => order.status)} date={today} />
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Best sellers</h2>
          <span className="text-sm text-muted-foreground">All time · top 6 by servings in completed orders</span>
        </div>
        {bestSellers.length ? (
          <BestSellersChart items={bestSellers} />
        ) : (
          <Card className="border shadow-none"><CardHeader><CardTitle>Nothing completed yet</CardTitle></CardHeader><CardContent className="text-muted-foreground">Best sellers appear once orders are marked completed.</CardContent></Card>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Chatbot conversations</h2>
          <span className="text-sm text-muted-foreground">Rule-based assistant, logged locally</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border shadow-none"><CardHeader><CardTitle>Total conversations</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{conversations}</CardContent></Card>
          <Card className="border shadow-none"><CardHeader><CardTitle>Conversations today</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{conversationsToday}</CardContent></Card>
          <Card className="border shadow-none"><CardHeader><CardTitle>Messages logged</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{logRows.length}</CardContent></Card>
        </div>
      </section>

      <section><div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-semibold tracking-tight">Stock requiring attention</h2><span className="text-sm text-muted-foreground">{lowStock.length} variants</span></div><div className="grid gap-4 md:grid-cols-2">{lowStock.length ? lowStock.slice(0, 12).map((item) => {
        const variant = Array.isArray(item.menu_variants) ? item.menu_variants[0] : item.menu_variants;
        const menuItem = variant && (Array.isArray(variant.menu_items) ? variant.menu_items[0] : variant.menu_items);
        const available = item.current_stock - item.reserved_stock;
        return <Card className="border shadow-none" key={item.id}><CardContent className="flex items-center justify-between gap-4"><div><CardTitle>{menuItem?.name ?? "Menu item"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{variant?.name ?? "Variant"} · {variant?.serving_label ?? ""}</p></div><div className="text-right"><p className={available <= 0 ? "font-semibold text-destructive" : "font-semibold text-amber-700 dark:text-amber-400"}>{available <= 0 ? "Out of stock" : "Low stock"}</p><p className="mt-1 text-sm text-muted-foreground">Available: {available} · Minimum: {item.minimum_stock}</p></div></CardContent></Card>;
      }) : <Card className="border shadow-none"><CardHeader><CardTitle>Stock looks healthy</CardTitle></CardHeader><CardContent className="text-muted-foreground">No variants are at or below their minimum stock.</CardContent></Card>}</div></section>
    </main>
  );
}
