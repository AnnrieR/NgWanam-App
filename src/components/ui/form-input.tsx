"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Input as TextInput } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { validImageSize, IMAGE_UPLOAD_HINT } from "@/lib/image-upload";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

function RemovePhotoCheckbox(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [checked, setChecked] = React.useState(Boolean(props.defaultChecked));
  const [open, setOpen] = React.useState(false);
  return <>
    <Checkbox name={props.name} value="on" checked={checked} onCheckedChange={next => { if (next) setOpen(true); else setChecked(false); }} />
    <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent>
      <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
      <AlertDialogDescription>Your photo will be removed when you save the profile changes.</AlertDialogDescription>
      <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" variant="destructive" onClick={() => { setChecked(true); setOpen(false); }}>Remove photo</Button></div>
    </AlertDialogContent></AlertDialog>
  </>;
}

function FileInput({ className, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [filename, setFilename] = React.useState("");
  const [error, setError] = React.useState("");
  const errorId = React.useId();
  return <span className="grid min-w-0 gap-2">
    <input {...props} type="file" ref={ref} className="sr-only" tabIndex={-1} required={false} onChange={event => {
      const file = event.currentTarget.files?.[0];
      const allowed = String(props.accept ?? "").split(",");
      if (file && (!validImageSize(file.size) || (allowed.length && !allowed.includes(file.type)))) {
        event.currentTarget.value = ""; setFilename(""); setError(IMAGE_UPLOAD_HINT + " Choose an allowed image format.");
      } else { setFilename(file?.name ?? ""); setError(""); }
      onChange?.(event);
    }} />
    <Button type="button" variant="outline" className={cn("w-full min-w-0 justify-start gap-2 text-left", className)} disabled={props.disabled} aria-label={props["aria-label"] ?? "Choose image"} aria-describedby={error ? errorId : props["aria-describedby"]} onClick={() => ref.current?.click()}>
      <Upload className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate" title={filename || undefined}>{filename || "Choose image"}</span>
    </Button>
    {error && <span id={errorId} role="alert" className="text-xs text-destructive">{error}</span>}
  </span>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  if (props.type === "date" || props.type === "datetime-local") return <DatePicker {...props} />;
  if (props.type === "file") return <FileInput {...props} />;
  if (props.type === "checkbox" && props.name === "removeAvatar") return <RemovePhotoCheckbox {...props} />;
  if (props.type === "checkbox") return <Checkbox id={props.id} name={props.name} value={String(props.value ?? "on")} checked={props.checked} defaultChecked={props.defaultChecked} disabled={props.disabled} required={props.required} className={props.className} aria-label={props["aria-label"]} onCheckedChange={checked => {
    const target = { checked, name: props.name ?? "", value: String(props.value ?? "on") };
    props.onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
  }} />;
  return <TextInput {...props} />;
}
