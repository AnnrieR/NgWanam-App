import { requireRole } from "@/lib/auth";
import { RoleDashboard } from "@/components/role-dashboard";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["staff", "admin"]);
  return <RoleDashboard fullName={profile.full_name} role={profile.role === "admin" ? "admin" : "staff"}>{children}</RoleDashboard>;
}
