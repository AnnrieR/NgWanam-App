import { OperationsDashboard } from "@/components/operations-dashboard";
import { requireRole } from "@/lib/auth";
import { getDashboardOrders } from "@/lib/dashboard-data";
import { manilaDate } from "@/lib/operations";

export default async function AdminPage() {
  await requireRole(["admin"]);
  const { orders, failed } = await getDashboardOrders();
  return <OperationsDashboard orders={orders} failed={failed} today={manilaDate(new Date())} inventoryHref="/admin/inventory" />;
}
