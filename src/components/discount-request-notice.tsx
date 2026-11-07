import { Info } from "lucide-react";
import { combinedDiscountReminder, discountIdReminder, discountRequestLabels, discountRequestFromNote, discountReviewNotice } from "@/lib/discount-request";

export function DiscountRequestNotice({ staffNote, driverNote }: { staffNote: string | null; driverNote?: string | null }) {
  const request = discountRequestFromNote(staffNote) ?? discountRequestFromNote(driverNote);
  if (!request) return null;
  return <section role="status" aria-label="Discount review request" className="mb-4 flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-950 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100">
    <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
    <div className="space-y-1 text-xs leading-5">
      <h2 className="text-sm font-semibold">{discountRequestLabels[request]} discount review requested</h2>
      <p>{discountIdReminder}</p>
      {request === "both" && <p>{combinedDiscountReminder}</p>}
      <p>{discountReviewNotice}</p>
    </div>
  </section>;
}
