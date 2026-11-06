export type DiscountRequest = "none" | "pwd" | "senior";

export const discountIdReminder = "Prepare a valid PWD or Senior Citizen ID. The ID owner must be present at delivery or pick-up.";
export const discountReviewNotice = "Eligibility is subject to verification by staff or rider. No discount is applied to the online total.";

const markers = {
  pwd: "[PWD discount review requested]",
  senior: "[Senior Citizen discount review requested]",
} as const;

export function discountRequestFromNote(note: string | null | undefined): Exclude<DiscountRequest, "none"> | null {
  for (const type of ["pwd", "senior"] as const) if (note?.startsWith(markers[type])) return type;
  return null;
}

/** A review request only: never a price, payment, or eligibility decision. */
export function withDiscountRequest(note: string, type: DiscountRequest) {
  if (type === "none") return note;
  return `${markers[type]} ${discountIdReminder} ${discountReviewNotice}${note ? `\n${note}` : ""}`;
}
