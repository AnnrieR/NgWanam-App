import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChatbotLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["customer", "staff", "delivery", "admin"]);
  return children;
}
