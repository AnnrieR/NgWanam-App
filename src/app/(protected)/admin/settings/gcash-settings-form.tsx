"use client";

import { useActionState, useRef, useState } from "react";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { GcashQrImage } from "@/components/gcash-qr-image";
import { IMAGE_UPLOAD_HINT } from "@/lib/image-upload";
import { normalizeGcashNumber } from "@/lib/gcash-settings";
import { saveGcashSettings, type GcashSettingsState } from "./actions";

export function GcashSettingsForm({ settings, qrUrl }: { settings: {
  gcash_account_name: string | null; gcash_account_number: string | null; gcash_enabled: boolean; updated_at: string;
}; qrUrl: string | null }) {
  const [state, action, pending] = useActionState<GcashSettingsState, FormData>(saveGcashSettings, {});
  const [name, setName] = useState(settings.gcash_account_name ?? "");
  const [number, setNumber] = useState(settings.gcash_account_number ?? "");
  const [enabled, setEnabled] = useState(settings.gcash_enabled);
  const [remove, setRemove] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const confirmed = useRef(false);
  const ref = useRef<HTMLFormElement>(null);
  return <>
    <Form ref={ref} action={action} className="space-y-5" onSubmit={event => {
      if (confirmed.current) { confirmed.current = false; return; }
      event.preventDefault();
      const file = new FormData(event.currentTarget).get("qrImage");
      setReview(`${enabled ? "Enable" : "Disable"} manual GCash. Recipient: ${name.trim() || "Not set"} · ${normalizeGcashNumber(number) || "Not set"}. QR: ${remove ? "Remove" : file instanceof File && file.size ? "Replace with selected image" : "Keep current"}.`);
    }}>
      <input type="hidden" name="version" value={settings.updated_at} /><input type="hidden" name="confirmed" value="yes" />
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <Label className="flex items-center gap-2"><Input name="enabled" type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Enable manual GCash at checkout</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label className="grid gap-2">GCash account name<Input name="accountName" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={120} required={enabled} autoComplete="off" placeholder="Registered recipient name" /></Label>
          <Label className="grid gap-2">GCash account number<Input name="accountNumber" type="tel" value={number} onChange={event => setNumber(event.target.value)} maxLength={24} required={enabled} autoComplete="off" placeholder="09XXXXXXXXX" /></Label>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">Use the exact account name and number registered in GCash. Restaurant contact numbers are separate and will not be changed.</p>
        {qrUrl && <div className="space-y-3"><p className="text-sm font-semibold">Current payment QR</p><GcashQrImage key={qrUrl} src={qrUrl} /><Label className="flex items-center gap-2"><Input name="removeQr" type="checkbox" checked={remove} onChange={event => setRemove(event.target.checked)} />Remove current QR when saving</Label></div>}
        <Label className="grid gap-2">{qrUrl ? "Replace QR image (optional)" : "GCash QR image (optional)"}<Input name="qrImage" type="file" accept="image/png,image/jpeg,image/webp" disabled={remove} /><span className="text-xs font-normal text-muted-foreground">PNG, JPEG or WebP. {IMAGE_UPLOAD_HINT} Upload the actual payment QR; verify its recipient in the GCash app.</span></Label>
        {state.error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Review GCash settings"}</Button>
      </fieldset>
    </Form>
    <AlertDialog open={!!review} onOpenChange={open => { if (!pending && !open) setReview(null); }}><AlertDialogContent>
      <AlertDialogTitle>Save GCash payment settings?</AlertDialogTitle>
      <AlertDialogDescription>{review} Confirm the destination is correct before customers send money. This does not charge or verify payments, and does not change existing orders.</AlertDialogDescription>
      <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={pending} onClick={() => setReview(null)}>Cancel</Button><Button type="button" disabled={pending} onClick={() => { confirmed.current = true; setReview(null); ref.current?.requestSubmit(); }}>Confirm save</Button></div>
    </AlertDialogContent></AlertDialog>
  </>;
}
