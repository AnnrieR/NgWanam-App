"use client";

import { useActionState } from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";
import { startGoogle } from "@/app/auth/google/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";

export function GoogleAuthForm({ linking = false }: { linking?: boolean }) {
  const [state, action, pending] = useActionState(startGoogle, {});
  return <form action={action} aria-label={linking ? "Link Google account" : "Continue with Google"} aria-busy={pending} className="grid min-w-0 gap-3">
    {linking && <>
      <input type="hidden" name="link" value="yes" />
      <label className="grid gap-1 text-sm">Current password
        <Input name="password" type="password" autoComplete="current-password" required disabled={pending} />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="consent" value="yes" type="checkbox" required disabled={pending} />
        I approve linking the Google account with the same verified email to my existing account.
      </label>
    </>}
    {state.error && <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm leading-relaxed text-destructive">{state.error}</p>}
    {linking ? <Button type="submit" variant="outline" disabled={pending} className="min-h-11 w-full whitespace-normal px-3 py-2">
      {pending ? "Please wait…" : "Verify password and link Google"}
    </Button> : <Button type="submit" variant="outline" disabled={pending}
      className="google-sign-in-button grid h-11 w-full min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] gap-2.5 rounded-xl border border-[#747775] bg-white px-3 py-0 text-sm font-medium text-[#1F1F1F] shadow-sm transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#747775] hover:bg-[#F2F2F2] hover:text-[#1F1F1F] hover:shadow-md active:translate-y-0 active:bg-[#E8E8E8] focus-visible:border-[#747775] focus-visible:ring-2 focus-visible:ring-[#747775]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 motion-reduce:transition-none dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] dark:hover:border-[#B6B8B6] dark:hover:bg-[#202022] dark:hover:text-[#E3E3E3] dark:active:bg-[#2B2B2E] dark:focus-visible:border-[#8E918F] dark:focus-visible:ring-[#8E918F]">
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white">
        <Image src="/google-g.png" alt="" width={20} height={20} className="size-5 object-contain" unoptimized />
      </span>
      <span className="min-w-0 text-center leading-5">{pending ? "Connecting…" : "Continue with Google"}</span>
      <span aria-hidden="true" className="flex size-6 items-center justify-center">{pending && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />}</span>
    </Button>}
  </form>;
}
