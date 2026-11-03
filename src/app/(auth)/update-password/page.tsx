
import { Form } from "@/components/ui/form";

import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

import { updatePassword } from "../password-actions";

type UpdatePasswordPageProps = { searchParams: Promise<{ error?: string }> };

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const { error } = await searchParams;
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md items-center px-6 py-12"><div className="absolute top-3 right-3"><ThemeToggle /></div><Card className="w-full border-stone-200 shadow-xl shadow-stone-950/5 dark:border-slate-700 dark:shadow-black/40"><CardHeader><p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Ng Wanam</p><CardTitle className="text-3xl">Choose a new password</CardTitle><CardDescription>Use at least 8 characters, then sign in with the new password.</CardDescription></CardHeader><CardContent><Form action={updatePassword} className="space-y-5"><Label className="grid gap-2 text-sm font-medium" htmlFor="password">New password<Input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" /></Label><Label className="grid gap-2 text-sm font-medium" htmlFor="confirmPassword">Confirm new password<Input autoComplete="new-password" id="confirmPassword" minLength={8} name="confirmPassword" required type="password" /></Label>{error && <p className="text-sm text-destructive">Passwords must match and have at least 8 characters.</p>}<Button className="w-full" size="lg" type="submit">Update password</Button></Form></CardContent></Card></main>
  );
}
