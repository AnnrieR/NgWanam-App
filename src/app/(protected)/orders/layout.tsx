import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Gates the whole `/orders` subtree. The customer list and the detail page
 * each apply their own role rules on top of this, so the layout only has to
 * admit every role that can legitimately open an order detail page — customers
 * review and cancel, staff accept and advance, riders follow progress, and
 * admins cover both sides.
 */
export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["customer", "staff", "delivery", "admin"]);
  return children;
}
