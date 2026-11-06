"use client";

import { Form } from "@/components/ui/form";

import { Disclosure, DisclosureSummary } from "@/components/ui/disclosure";
import { Label } from "@/components/ui/label";
import { FormSelect, SelectOption } from "@/components/ui/form-select";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/form-input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { createAccount } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create account"}</Button>;
}

export function CreateAccountForm() {
  const [state, action] = useActionState(createAccount, { error: "" });
  return <Disclosure className="rounded-xl border bg-white p-5 dark:bg-slate-900">
    <DisclosureSummary className="cursor-pointer text-sm font-semibold text-red-600 dark:text-red-400">+ Create admin, staff, or delivery account</DisclosureSummary>
    <p className="mt-3 text-xs text-muted-foreground">Local account with a manually assigned password. No email invitation or OTP.</p>
    <Form action={action} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2 text-xs font-semibold">Full name<Input name="fullName" maxLength={100} required /></Label>
        <Label className="grid gap-2 text-xs font-semibold">Email<Input name="email" type="email" maxLength={254} autoComplete="off" required /></Label>
        <Label className="grid gap-2 text-xs font-semibold">Role<FormSelect name="role" defaultValue="staff" className="rounded-lg border bg-background px-3 py-2"><SelectOption value="staff">Staff</SelectOption><SelectOption value="delivery">Delivery</SelectOption><SelectOption value="admin">Administrator</SelectOption></FormSelect></Label>
        <Label className="grid gap-2 text-xs font-semibold">Phone (optional)<Input name="phone" type="tel" maxLength={30} /></Label>
        <div className="grid gap-2">
          <Label htmlFor="create-account-password" className="text-xs font-semibold">Password</Label>
          <PasswordInput id="create-account-password" name="password" minLength={8} maxLength={72} autoComplete="new-password" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="create-account-confirm-password" className="text-xs font-semibold">Confirm password</Label>
          <PasswordInput id="create-account-confirm-password" name="confirmPassword" minLength={8} maxLength={72} autoComplete="new-password" required />
        </div>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <Submit />
    </Form>
  </Disclosure>;
}
