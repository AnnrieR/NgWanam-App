"use client";

import { useActionState } from "react";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { moderateFeedback } from "./actions";

export function FeedbackReviewForm({ id, quote, eligible }: { id: string; quote: string; eligible: boolean }) {
  const [state, action, pending] = useActionState(moderateFeedback, {});
  return <Form action={action} className="mt-4 space-y-3">
    <input name="ratingId" type="hidden" value={id} />
    <fieldset disabled={pending} className="space-y-3">
      {eligible && <Label className="grid gap-2 text-sm font-semibold">Public excerpt
        <Textarea name="publicQuote" defaultValue={quote} maxLength={500} />
        <span className="text-xs font-normal text-muted-foreground">Review for phone numbers, addresses, full names and sensitive details. Redact them without changing the customer&apos;s meaning. Original feedback stays private and unchanged.</span>
      </Label>}
      <div className="flex flex-wrap gap-2">
        {eligible && <Button name="decision" value="approved" type="submit">Approve public testimonial</Button>}
        <Button name="decision" value="private" type="submit" variant="outline">Keep private / unpublish</Button>
        <Button name="decision" value="pending" type="submit" variant="ghost">Mark pending</Button>
      </div>
    </fieldset>
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    {state.saved && <p role="status" className="text-sm text-green-700 dark:text-green-400">Review saved.</p>}
    {pending && <p role="status" className="text-sm text-muted-foreground">Saving review…</p>}
  </Form>;
}
