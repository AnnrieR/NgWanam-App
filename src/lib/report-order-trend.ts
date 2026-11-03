import { manilaDate } from "@/lib/operations";

/** Placement counts, including cancelled orders; never sales or serving totals. */
export function dailyOrderCounts(orders: { created_at: string }[], weekStart: string) {
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: manilaDate(new Date(Date.parse(weekStart) + index * 24 * 60 * 60 * 1000)),
    count: 0,
  }));
  const byDate = new Map(days.map(day => [day.date, day]));
  for (const order of orders) {
    const day = byDate.get(manilaDate(order.created_at));
    if (day) day.count += 1;
  }
  return days;
}
