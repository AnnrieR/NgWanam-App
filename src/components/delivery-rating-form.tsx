"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitDeliveryRating, type RatingState } from "@/app/(protected)/orders/[orderId]/rating-actions";

export function DeliveryRatingForm({ orderId, riderName, existingRating, existingComment, canRate }: { orderId: string; riderName: string; existingRating: number | null; existingComment: string | null; canRate: boolean }) {
  const [stars, setStars] = useState(0);
  const [state, action, pending] = useActionState<RatingState, FormData>(submitDeliveryRating, {});
  const recorded = existingRating !== null || state.saved;
  const displayed = existingRating ?? stars;
  return <section aria-labelledby="rider-rating-title" className="mt-5 rounded-2xl border bg-background p-5 shadow-sm">
    <h2 id="rider-rating-title" className="flex items-center gap-2 text-lg font-semibold"><Star aria-hidden="true" className="size-5 text-amber-500" />{recorded ? "Your rider rating" : "Rate your rider"}</h2>
    <p className="mt-2 text-sm text-muted-foreground">Rider: <strong className="text-foreground">{riderName}</strong></p>
    {recorded ? <div role="status" className="mt-4"><p className="font-semibold text-amber-700 dark:text-amber-300">{displayed} / 5 stars · Thank you for your feedback!</p>{existingComment && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere]">{existingComment}</p>}<p className="mt-2 text-xs text-muted-foreground">One rating per delivery. Submitted ratings cannot be edited.</p></div>
      : canRate ? <Form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="orderId" value={orderId} /><input type="hidden" name="rating" value={stars || ""} />
        <fieldset disabled={pending}><legend className="mb-2 text-sm font-medium">How was your delivery? <span className="text-muted-foreground">(required)</span></legend><div className="flex flex-wrap gap-2">{[1,2,3,4,5].map(value => <Button key={value} type="button" variant="outline" aria-label={`${value} ${value===1 ? "star" : "stars"}`} aria-pressed={stars===value} onClick={() => setStars(value)} className={`size-11 p-0 ${stars>=value ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}><Star aria-hidden="true" className={`size-6 ${stars>=value ? "fill-current" : ""}`} /></Button>)}</div><p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{stars ? `${stars} of 5 stars selected` : "Select a star rating."}</p></fieldset>
        <Label className="grid gap-2">Comment (optional)<Textarea name="comment" maxLength={500} disabled={pending} placeholder="Tell us about your delivery experience…" /><span className="text-xs font-normal text-muted-foreground">Maximum 500 characters. Please avoid including personal details.</span></Label>
        {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending || !stars}>{pending ? "Submitting…" : "Submit rating"}</Button>
      </Form> : <p className="mt-4 text-sm text-muted-foreground">Rating becomes available after the rider marks your delivery Delivered. Cancelled orders cannot be rated.</p>}
  </section>;
}
