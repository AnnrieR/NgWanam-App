"use client";

import { Form } from "@/components/ui/form";

import { Button } from "@/components/ui/button";

import { LoaderCircle, LogOut, TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/sign-out";

function LogoutContent({ onClose, pendingRef }: { onClose: () => void; pendingRef: React.RefObject<boolean> }) {
  const { pending } = useFormStatus();
  useEffect(() => { pendingRef.current = pending; }, [pending, pendingRef]);
  return <div className="w-full max-w-[372px] rounded-[22px] bg-white px-7 py-7 text-center shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (pending && event.key === "Escape") event.preventDefault(); }}>
    <span className="relative mx-auto grid size-[86px] place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
      <LogOut aria-hidden="true" className="size-10" strokeWidth={2} />
      <span className="absolute bottom-1 right-0 rounded-full bg-white p-1 dark:bg-slate-900"><TriangleAlert aria-hidden="true" className="size-7 fill-orange-500 text-white" /></span>
    </span>
    <DialogTitle className="mt-4 text-[28px] font-bold tracking-tight">Log Out?</DialogTitle>
    <DialogDescription className="mx-auto mt-2 max-w-60 text-base leading-6 text-slate-600 dark:text-slate-300">Are you sure you want to<br />log out of your account?</DialogDescription>
    <div className="mt-6 grid grid-cols-2 gap-2.5">
      <Button variant="ghost" autoFocus disabled={pending} className="min-h-11 rounded-lg border border-red-500 px-3 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40" onClick={onClose} type="button">Cancel</Button>
      <Button variant="ghost" disabled={pending} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#ff1807] px-3 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-60" type="submit">{pending ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Logging out...</> : "Log Out"}</Button>
    </div>
  </div>;
}

export function LogoutDialog({ onClose }: { onClose: () => void }) {
  const pending = useRef(false);
  return <Dialog open onOpenChange={open => { if (!open && !pending.current) onClose(); }}>
    <DialogContent showCloseButton={false} className="p-0 sm:max-w-[372px]">
    <Form action={signOut}>
      <LogoutContent onClose={onClose} pendingRef={pending} />
    </Form>
    </DialogContent>
  </Dialog>;
}
