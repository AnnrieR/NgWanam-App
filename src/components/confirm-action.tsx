"use client";

import { Form } from "@/components/ui/form";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

function ConfirmButtons({ close, pendingRef, confirmLabel, variant }: { close: () => void; pendingRef: React.RefObject<boolean>; confirmLabel: string; variant: "default" | "destructive" }) {
  const { pending } = useFormStatus();
  // Gate dismissals immediately when the pending form is rendered.
  return <div className="mt-5 flex justify-end gap-2" onKeyDown={event => { if (pending) event.stopPropagation(); }}>
    <Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button>
    <Button type="submit" variant={variant} disabled={pending} onClick={() => { pendingRef.current = true; }}>{pending ? "Saving..." : confirmLabel}</Button>
  </div>;
}

export function ConfirmAction({ action, fields = {}, title, description, triggerLabel = "Delete", confirmLabel = "Delete permanently", variant = "destructive" }: {
  action: (formData: FormData) => void | Promise<void>;
  fields?: Record<string, string>;
  title: string;
  description: string;
  triggerLabel?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  const pending = useRef(false);
  return <>
    <Button type="button" size="sm" variant={variant} onClick={() => { pending.current = false; setOpen(true); }}>{triggerLabel}</Button>
    <AlertDialog open={open} onOpenChange={next => { if (!pending.current) setOpen(next); }}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <Form action={action}>
          {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <ConfirmButtons close={() => setOpen(false)} pendingRef={pending} confirmLabel={confirmLabel} variant={variant} />
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
