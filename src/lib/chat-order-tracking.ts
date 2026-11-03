export type ChatOrderTracking = {
  id: string;
  number: string;
  status: string;
  pickup: boolean;
  createdAt: string;
  preparingAt: string | null;
  readyAt: string | null;
  outAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  requestedAt: string | null;
  deliveryStatus: string | null;
};

export function isTrackingQuestion(text: string) {
  return /\b(track|tracking)\b/i.test(text)
    || /\b(order|delivery|deliveries)\b.*\b(status|where|nasaan|asan|saan)\b/i.test(text)
    || /\b(status|where|nasaan|asan|saan)\b.*\b(order|delivery|deliveries)\b/i.test(text);
}

/** Accepts #123, NW-123, or "order 123"; never uses untrusted text as SQL. */
export function trackingOrderNumber(text: string): string | null {
  const match = text.match(/(?:#(?:NW[- ]?)?|\bNW[- ]?|\border\s*(?:number|no\.?|id)?\s*[:#]?\s*)(\d+(?:-\d+)*)\b/i);
  return match ? match[1].split("-").at(-1)! : null;
}
