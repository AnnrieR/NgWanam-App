import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const count = new Intl.NumberFormat("en-PH");
const stages = [
  { status: "pending", label: "Pending", color: "#d97706" },
  { status: "confirmed", label: "Confirmed", color: "#2563eb" },
  { status: "preparing", label: "Preparing", color: "#ea580c" },
  { status: "ready", label: "Ready / delivery", color: "#9333ea" },
  { status: "completed", label: "Completed", color: "#16a34a" },
  { status: "cancelled", label: "Cancelled", color: "#dc2626" },
];

export function OrderVolumeTrend({ days }: { days: { date: string; count: number }[] }) {
  const maximum = Math.max(1, ...days.map(day => day.count));
  return <Card className="min-w-0 border shadow-none" data-report-chart="orders">
    <CardHeader><CardTitle>Orders placed · last 7 days</CardTitle><p className="text-xs leading-5 text-muted-foreground">{days[0]?.date} to {days.at(-1)?.date} · Philippine time. Daily order counts, not sales amounts.</p></CardHeader>
    <CardContent>
      <p className="mb-5 text-2xl font-semibold">{count.format(days.reduce((sum, day) => sum + day.count, 0))}<span className="ml-2 text-xs font-normal text-muted-foreground">orders in 7 days</span></p>
      <ol aria-label="Daily orders placed" className="grid grid-cols-7 gap-1 sm:gap-3">{days.map(day => <li key={day.date} data-order-date={day.date} data-order-count={day.count} className="min-w-0 text-center">
        <div aria-hidden="true" className="relative h-40 border-b border-dashed bg-muted/20"><div className="absolute inset-x-1 bottom-0 rounded-t-md bg-gradient-to-t from-blue-700 to-sky-400 sm:inset-x-3" style={{ height: `${day.count / maximum * 100}%` }} /></div>
        <p className="mt-2 text-[10px] font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-xs">{count.format(day.count)}</p>
        <time dateTime={day.date} className="mt-1 block text-[10px] text-muted-foreground sm:text-xs">{day.date.slice(5).replace("-", "/")}</time>
      </li>)}</ol>
      {!days.some(day => day.count > 0) && <p className="mt-4 text-sm text-muted-foreground">No orders were placed in this period.</p>}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Counts each order once on its placement date, including cancelled orders. Includes delivery and pick-up, COD and GCash.</p>
    </CardContent>
  </Card>;
}

export function OrderStatusChart({ statuses, date }: { statuses: string[]; date: string }) {
  const breakdown = stages.map(stage => ({ ...stage, count: statuses.filter(status => status === stage.status).length }));
  return <Card className="min-w-0 border shadow-none" data-report-chart="statuses">
    <CardHeader><CardTitle>Order status breakdown</CardTitle><p className="text-xs leading-5 text-muted-foreground">Current status of orders placed on {date} · Philippine time.</p></CardHeader>
    <CardContent>
      <div className="flex min-h-60 flex-wrap items-center justify-center gap-6">
        <div className="relative size-40 shrink-0">
          <svg aria-hidden="true" viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" className="text-muted" strokeWidth="13" />
            {breakdown.map((stage, index) => {
              const percentage = statuses.length ? stage.count / statuses.length * 100 : 0;
              const start = statuses.length ? breakdown.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / statuses.length * 100 : 0;
              return stage.count > 0 && <circle key={stage.status} cx="60" cy="60" r="48" fill="none" stroke={stage.color} strokeWidth="13" pathLength="100" strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-start} />;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl">{statuses.length}</strong><span className="text-xs text-muted-foreground">orders placed</span></div>
        </div>
        <ul aria-label="Orders by status" className="min-w-40 flex-1 space-y-3">{breakdown.map(stage => <li key={stage.status} data-status={stage.status} data-count={stage.count} className="flex items-center gap-2 text-xs"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} /><span className="flex-1">{stage.label}</span><strong>{stage.count}</strong></li>)}</ul>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{statuses.length ? "Ready / delivery includes deliveries awaiting staff completion. Cancelled orders remain visible." : "No orders were placed on this date."}</p>
    </CardContent>
  </Card>;
}

export function BestSellersChart({ items }: { items: [string, number][] }) {
  const maximum = Math.max(1, ...items.map(([, quantity]) => quantity));
  return <Card className="border shadow-none" data-report-chart="best-sellers"><CardContent>
    <ol aria-label="Best sellers by servings" className="space-y-5">{items.map(([name, servings], index) => <li key={name} data-item={name} data-servings={servings}>
      <div className="mb-2 flex items-start justify-between gap-3 text-sm"><span className="min-w-0 font-medium [overflow-wrap:anywhere]"><span className="mr-2 text-muted-foreground">{index + 1}.</span>{name}</span><strong className="shrink-0 text-xs tabular-nums">{servings} {servings === 1 ? "serving" : "servings"}</strong></div>
      <div aria-hidden="true" className="h-4 overflow-hidden rounded-md bg-muted"><div className="h-full rounded-md bg-gradient-to-r from-[#bd2507] to-[#f59e0b]" style={{ width: `${servings / maximum * 100}%` }} /></div>
    </li>)}</ol>
  </CardContent></Card>;
}
