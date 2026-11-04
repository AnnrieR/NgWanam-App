"use client";

import { useActionState } from "react";
import { startGoogle } from "@/app/auth/google/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";

export function GoogleAuthForm({ linking = false }: { linking?: boolean }) {
  const [state, action, pending] = useActionState(startGoogle, {});
  return <form action={action} className="grid gap-3">
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
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <Button type="submit" variant="outline" disabled={pending} className="w-full">
      {pending ? "Please wait…" : linking ? "Verify password and link Google" : "Continue with Google"}
    </Button>
  </form>;
}
