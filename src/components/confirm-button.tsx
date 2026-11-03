"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function ConfirmButton({ onConfirm, title, description, confirmLabel = "Remove", children, ...props }: Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Button {...props} type="button" onClick={() => setOpen(true)}>{children}</Button>
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={() => { onConfirm(); setOpen(false); }}>{confirmLabel}</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
