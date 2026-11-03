import { requireRole } from "@/lib/auth";
import { RoleDashboard } from "@/components/role-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["admin"]);
  return <RoleDashboard fullName={profile.full_name} role="admin">{children}</RoleDashboard>;
}
