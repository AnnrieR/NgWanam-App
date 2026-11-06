"use client";

import { Form } from "@/components/ui/form";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/form-input";

import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFormStatus } from "react-dom";
import { updateDeliveryStatus } from "@/app/(protected)/delivery/actions";
import { Button } from "@/components/ui/button";

function ProofForm({ onClose, pendingRef, titleId, descriptionId }: {
  onClose: () => void;
  pendingRef: React.RefObject<boolean>;
  titleId: string;
  descriptionId: string;
}) {
  const { pending } = useFormStatus();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { pendingRef.current = pending; }, [pending, pendingRef]);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  return <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <div className="flex items-start justify-between gap-3">
      <div><DialogTitle id={titleId} className="text-xl font-bold">Confirm delivery</DialogTitle><DialogDescription id={descriptionId} className="mt-2 text-sm text-muted-foreground">A proof photo is optional. You may confirm Delivered without uploading an image. Confirming Delivered deducts this order&apos;s reserved stock from on-hand inventory once. Staff can then finalize the order without another deduction.</DialogDescription></div>
      <Button variant="ghost" aria-label="Close proof upload" className="rounded-lg p-1 hover:bg-muted disabled:opacity-50" disabled={pending} onClick={onClose} type="button"><X className="size-5" /></Button>
    </div>
    <Label className="mt-5 grid cursor-pointer gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm dark:border-slate-600 dark:bg-slate-800">
      <span className="flex items-center gap-2 font-semibold"><ImagePlus className="size-5 text-red-500" />Proof photo (optional)</span>
      <Input autoFocus aria-label="Proof-of-delivery photo (optional)" type="file" name={photo ? "proofPhoto" : undefined} accept="image/jpeg,image/png,image/webp" disabled={pending} className="w-full min-w-0 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-white" onChange={(event) => {
        const file = event.currentTarget.files?.[0] ?? null;
        if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size >= 1024 * 1024)) {
          event.currentTarget.value = "";
          setPhoto(null);
          setPreview("");
          setError("Choose one JPG, PNG, or WebP image, smaller than 1 MB.");
          return;
        }
        setPhoto(file);
        setPreview(file ? URL.createObjectURL(file) : "");
        setError("");
      }} />
      <span className="text-xs text-muted-foreground">If uploading: one JPG, PNG, or WebP image · smaller than 1 MB</span>
    </Label>
    {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {preview && <div className="mt-4 space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote image */}
      <img alt="Selected proof-of-delivery preview" src={preview} className="max-h-52 w-full rounded-xl bg-muted object-contain" />
      <p className="break-all text-xs text-muted-foreground">{photo?.name}</p>
    </div>}
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="outline" disabled={pending} onClick={onClose} type="button">Cancel</Button>
      <Button disabled={pending} type="submit">{pending ? <><LoaderCircle className="size-4 animate-spin" />Confirming...</> : "Confirm delivered"}</Button>
    </div>
  </div>;
}

function ProofModal({ deliveryId, onClose }: { deliveryId: string; onClose: () => void }) {
  const pending = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  return <Dialog open onOpenChange={open => { if (!open && !pending.current) onClose(); }}>
    <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-md">
    <Form action={updateDeliveryStatus}>
      <input name="deliveryId" type="hidden" value={deliveryId} />
      <input name="nextStatus" type="hidden" value="delivered" />
      <ProofForm onClose={onClose} pendingRef={pending} titleId={titleId} descriptionId={descriptionId} />
    </Form>
    </DialogContent>
  </Dialog>;
}

export function DeliveryProofDialog({ deliveryId }: { deliveryId: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button size="sm" type="button" onClick={() => setOpen(true)}>Mark delivered</Button>
    {open && <ProofModal deliveryId={deliveryId} onClose={() => setOpen(false)} />}
  </>;
}
