import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FeedbackReviewForm } from "./review-form";

type Feedback = { id: string; order_number: number; rider_id: string; rider_name: string | null; customer_name: string | null; rating: number; comment: string | null; created_at: string; review_status: string; allow_public: boolean; public_quote: string | null };
type Summary = { rider_id: string; average_rating: number; rating_count: number };

export default async function RiderFeedbackPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [{ data, error }, { data: summaries, error: summaryError }] = await Promise.all([
    supabase.rpc("get_admin_rider_feedback"), supabase.rpc("get_rider_rating_summaries"),
  ]);
  const feedback = (data ?? []) as Feedback[];
  const scores = (summaries ?? []) as Summary[];
  const count = scores.reduce((sum, row) => sum + Number(row.rating_count), 0);
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold">Rider Feedback</h1><p className="mt-2 text-sm text-muted-foreground">Private admin review queue. Negative feedback is retained, never discarded to improve a score.</p></header>
    <p className="rounded-xl border bg-background p-4 text-sm">{summaryError ? "Internal scores could not be loaded." : `${count} total internal ratings across ${scores.length} riders.`} Internal rider averages include all valid ratings regardless of publication status. Public testimonials are selected, approved 4–5-star comments—not an overall satisfaction score.</p>
    {error ? <p role="alert" className="rounded-xl border border-red-300 p-4">Feedback could not be loaded. Apply the targeted feedback migration before using this page, then refresh.</p>
      : !feedback.length ? <p className="p-4 text-muted-foreground">No rider feedback submitted yet.</p>
      : feedback.map(row => <article key={row.id} className="rounded-xl border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold">{Number(row.rating).toFixed(1)} / 5 · {row.rider_name || "Rider"}</h2><p className="mt-1 text-sm text-muted-foreground">Order #NW-{row.order_number} · {row.customer_name || "Customer"}</p></div>
          <p className="rounded-full bg-muted px-3 py-1 text-sm font-semibold capitalize">{row.review_status}</p>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{row.comment || "No written comment."}</p>
        {scores.find(score => score.rider_id === row.rider_id) && <p className="mt-2 text-xs font-semibold">Internal rider average (all valid ratings): {Number(scores.find(score => score.rider_id === row.rider_id)!.average_rating).toFixed(1)} / 5</p>}
        <p className="mt-2 text-xs text-muted-foreground">Public consent: {row.allow_public ? "Customer opted in" : "Not granted—private only"}</p>
        <FeedbackReviewForm id={row.id} quote={row.public_quote ?? row.comment ?? ""} eligible={row.allow_public && row.rating >= 4 && Boolean(row.comment?.trim())} />
      </article>)}
  </div>;
}
