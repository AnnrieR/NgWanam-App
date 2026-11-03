"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Review changes" : "Add location"}</Button>;
}

export function DeliveryAreaForm({ area, action }: {
  area?: { id: string; name: string; fee: number; is_active: boolean };
  action: (data: FormData) => Promise<void>;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const [review, setReview] = useState<{ name: string; fee: string; active: boolean } | null>(null);
  return <>
    <Form ref={ref} action={action} className="space-y-4" onSubmit={event => {
      if (confirmed.current) { confirmed.current = false; return; }
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      setReview({ name: String(data.get("name")), fee: String(data.get("fee")), active: data.get("isActive") === "on" });
    }}>
      <input type="hidden" name="id" value={area?.id ?? ""} />
      <input type="hidden" name="confirmed" value="yes" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">Location name<Input name="name" defaultValue={area?.name ?? ""} minLength={2} maxLength={160} required placeholder="Barangay / subdivision / landmark" /></Label>
        <Label className="grid gap-2">Delivery fee (₱)<Input name="fee" type="number" min="0" max="99999999.99" step="0.01" defaultValue={area?.fee ?? ""} required placeholder="150.00" /></Label>
      </div>
      <Label className="flex items-center gap-2"><Input name="isActive" type="checkbox" defaultChecked={area?.is_active ?? true} />Available at checkout</Label>
      <SaveButton editing={!!area} />
    </Form>
    <AlertDialog open={!!review} onOpenChange={open => { if (!open) setReview(null); }}>
      <AlertDialogContent>
        <AlertDialogTitle>{area ? "Save delivery location changes?" : "Add delivery location?"}</AlertDialogTitle>
        <AlertDialogDescription>{review?.name} · ₱{Number(review?.fee ?? 0).toFixed(2)} · {review?.active ? "Active" : "Inactive"}. Applies to new checkout quotes only. Existing orders keep their saved location and fee.</AlertDialogDescription>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setReview(null)}>Cancel</Button><Button type="button" onClick={() => { confirmed.current = true; setReview(null); ref.current?.requestSubmit(); }}>Confirm save</Button></div>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
