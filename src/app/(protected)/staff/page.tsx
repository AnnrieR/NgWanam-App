import { OperationsDashboard } from "@/components/operations-dashboard";
import { getDashboardOrders } from "@/lib/dashboard-data";
import { requireRole } from "@/lib/auth";
import { manilaDate } from "@/lib/operations";

export default async function StaffPage() {
  await requireRole(["staff", "admin"]);
  const { orders, failed } = await getDashboardOrders();
  return <OperationsDashboard orders={orders} failed={failed} today={manilaDate(new Date())} />;
}
