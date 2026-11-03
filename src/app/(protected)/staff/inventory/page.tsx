import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadInventory, type InventoryRow } from "@/lib/inventory";
import { InventoryTable } from "./inventory-table";

type StaffInventoryPageProps = { searchParams: Promise<{ error?: string; updated?: string; low?: string; revision?: string }> };

export default async function StaffInventoryPage({ searchParams }: StaffInventoryPageProps) {
  const { profile } = await requireRole(["staff", "admin"]);
  const isAdmin = profile.role === "admin";
  const { error, updated, low, revision } = await searchParams;
  let rows: InventoryRow[] | undefined;
  try { rows = await loadInventory(await createClient()); } catch { /* Live inventory shows a retry/error state. */ }
  const notice = error === "stale-stock" ? "Stock changed while you were editing. Your changes were not saved. Review the latest quantities and try again."
    : error ? "Stock could not be updated. Use whole numbers, and keep on-hand stock at least equal to reserved stock."
    : updated === "inventory" ? "Stock and alert threshold updated." : null;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Ng Wanam Food House</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{isAdmin ? "Inventory Management" : "Inventory"}</h1><p className="mt-2 text-sm text-muted-foreground">Manage on-hand servings, reservations, and low-stock alert thresholds.</p></div>
      <Button render={<Link href={isAdmin ? "/admin" : "/staff"} />} variant="outline">Back to dashboard</Button>
    </header>
    {notice && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-green-500/10 text-green-800 dark:text-green-300"}`}>{notice}</p>}
    <Card className="border shadow-none">
      <CardHeader><CardTitle>Stock levels &amp; alerts</CardTitle><p className="text-sm leading-6 text-muted-foreground">Sellable = on hand − reserved. Low-stock alerts trigger when sellable stock is at or below the serving&apos;s threshold. Example: threshold 10 means an alert at 10 or fewer sellable servings. Delivery stock deducts when the rider confirms Delivered with proof. Pick-up stock deducts at staff Completed; delivery completion does not deduct twice.</p></CardHeader>
      <CardContent><InventoryTable key={revision ?? "inventory"} rows={rows} initialLowOnly={low === "1"} /></CardContent>
    </Card>
  </div>;
}
