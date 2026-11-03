import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CartLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["customer"]);
  return children;
}
