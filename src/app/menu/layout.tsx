import { requireRole } from "@/lib/auth";
import { RoleDashboard } from "@/components/role-dashboard";

export const dynamic = "force-dynamic";

/**
 * `/menu` used to be the customer shopping page. The adviser's Menu tab is a
 * CRUD screen instead, so this route now belongs to the people who maintain
 * the catalog - customers are sent to `/orders` (see `roleHome`).
 */
export default async function MenuLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["staff", "admin"]);
  return (
    <RoleDashboard fullName={profile.full_name} role={profile.role === "admin" ? "admin" : "staff"}>
      {children}
    </RoleDashboard>
  );
}
