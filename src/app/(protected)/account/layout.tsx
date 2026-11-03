import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Matches the page below: every role edits its own profile here.
  await requireRole(["customer", "staff", "delivery", "admin"]);
  return children;
}
