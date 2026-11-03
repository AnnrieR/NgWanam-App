import { requireRole } from "@/lib/auth";
import { RoleDashboard } from "@/components/role-dashboard";
import { createClient } from "@/lib/supabase/server";
import { TrackingRefresh } from "../orders/[orderId]/tracking-refresh";

export const dynamic = "force-dynamic";

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole(["delivery"]);
  const supabase = await createClient();
  const { count } = await supabase.from("deliveries").select("id, orders!inner(status)", { count: "exact", head: true }).eq("assigned_to", user.id).eq("status", "assigned").eq("orders.status", "ready");
  return <RoleDashboard fullName={profile.full_name} role={profile.role === "admin" ? "admin" : "delivery"} deliveryAssignments={count ?? 0}><TrackingRefresh active />{children}</RoleDashboard>;
}
