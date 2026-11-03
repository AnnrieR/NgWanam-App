
import { Form } from "@/components/ui/form";

import { Label } from "@/components/ui/label";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form-input";
import { ThemeToggle } from "@/components/theme-toggle";

import { requestPasswordReset } from "../password-actions";

type ForgotPasswordPageProps = { searchParams: Promise<{ error?: string; sent?: string }> };

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { error, sent } = await searchParams;
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md items-center px-6 py-12"><div className="absolute top-3 right-3"><ThemeToggle /></div><Card className="w-full border-stone-200 shadow-xl shadow-stone-950/5 dark:border-slate-700 dark:shadow-black/40"><CardHeader><p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Ng Wanam</p><CardTitle className="text-3xl">Reset password</CardTitle><CardDescription>Enter your email and we will send a recovery link.</CardDescription></CardHeader><CardContent><Form action={requestPasswordReset} className="space-y-5"><Label className="grid gap-2 text-sm font-medium" htmlFor="email">Email address<Input autoComplete="email" id="email" name="email" required type="email" /></Label>{(error || sent) && <p className={error ? "text-sm text-destructive" : "text-sm text-green-700"}>{error ? "We could not send a recovery link. Please try again." : "If this email has an account, a recovery link has been sent."}</p>}<Button className="w-full" size="lg" type="submit">Send recovery link</Button></Form><p className="mt-6 text-center text-sm text-muted-foreground"><Link className="font-medium text-primary hover:underline" href="/login">Back to sign in</Link></p></CardContent></Card></main>
  );
}
