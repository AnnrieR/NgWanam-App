import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

/**
 * Riders were asked not to have a dashboard of their own — the delivery queue
 * *is* the job. `/delivery` therefore sends them straight to it rather than
 * keeping a second, action-less copy of the same table one click away, and
 * every rider-facing link now points at `/delivery/orders` directly.
 *
 * `redirect()` throws NEXT_REDIRECT, so there is no return after it (the
 * layout's requireRole has already run, so this only ever fires for a rider).
 */
export default async function DeliveryPage() {
  await requireRole(["delivery"]);
  redirect("/delivery/orders");
}
