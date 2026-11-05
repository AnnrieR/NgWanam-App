"use client";

import { Form } from "@/components/ui/form";

import Link from "next/link";
import Image from "next/image";
import { Check, Eye, EyeOff, MailCheck, X } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/form-input";
import { cn } from "@/lib/utils";
import { GoogleAuthForm } from "@/components/google-auth-form";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { signIn, signUp, type AuthFormState } from "./actions";

type AuthFormProps = {
  mode: "login" | "register";
  notice?: string;
  googleEnabled?: boolean;
};

const initialState: AuthFormState = {};
const authInputClass = "block h-11 appearance-none rounded-xl border-input bg-background px-4 py-0 text-base leading-normal md:text-base focus-visible:ring-2";

export function AuthForm({ mode, notice, googleEnabled = false }: AuthFormProps) {
  const action = mode === "login" ? signIn : signUp;
  const isRegister = mode === "register";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordResetKey, setPasswordResetKey] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(async (previous, formData) => {
    const result = await action(previous, formData);
    if (isRegister && result.message && !result.error) {
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      // Remount both password widgets so any revealed values become masked again.
      setPasswordResetKey(current => current + 1);
      setVerificationMessage(result.message);
    }
    return result;
  }, initialState);

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a letter", ok: /[a-z]/i.test(password) },
    { label: "Contains a number", ok: /\d/.test(password) },
  ];
  const matches = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <Card className="w-full max-w-md border-0 bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="space-y-3 px-0 pt-0">
        <Link aria-label="Ng Wanam Food House home" className="w-fit" href="/">
          <Image alt="Ng Wanam Food House" className="size-14 object-contain" height={56} preload src="/menu-images/ng wanam logo.png" width={56} />
        </Link>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[#bd2507] uppercase dark:text-[#ffb35c]">NG WANAM</p>
          <CardTitle className="mt-2 text-3xl text-foreground">{isRegister ? "Create your account" : "Welcome back"}</CardTitle>
        </div>
        <CardDescription>
          {isRegister ? "Register, then verify your email before signing in to place orders." : "Sign in to continue your order."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Form action={formAction} className="space-y-6">
          <FieldGroup>
            {isRegister && (
              <Field>
                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                <Input className={authInputClass} id="fullName" name="fullName" autoComplete="name" required value={fullName} onChange={event => setFullName(event.target.value)} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input className={authInputClass} id="email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <PasswordInput
                key={`password-${passwordResetKey}`}
                autoComplete={isRegister ? "new-password" : "current-password"}
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                value={password}
              />
              {isRegister && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  {rules.map((rule) => (
                    <li className={cn("flex items-center gap-1.5 text-xs", rule.ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground")} key={rule.label}>
                      {rule.ok ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
                      {rule.label}
                    </li>
                  ))}
                </ul>
              )}
            </Field>
            {isRegister && (
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                <PasswordInput
                  key={`confirm-password-${passwordResetKey}`}
                  autoComplete="new-password"
                  id="confirmPassword"
                  name="confirmPassword"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  value={confirmPassword}
                />
                {confirmPassword.length > 0 && (
                  <p className={cn("text-xs", matches ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                    {matches ? "Passwords match." : "Passwords do not match yet."}
                  </p>
                )}
              </Field>
            )}
          </FieldGroup>

          {(state.error || notice) && <FieldError>{state.error || notice}</FieldError>}
          {!isRegister && state.message && <p className="text-sm text-green-700 dark:text-green-400">{state.message}</p>}

          <Button className="h-11 w-full rounded-xl bg-[#bd2507] text-white hover:bg-[#a71c04] dark:bg-[#bd2507] dark:text-white dark:hover:bg-[#a71c04]" size="lg" type="submit" disabled={isPending}>
            {isPending ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </Button>
        </Form>

        {!isRegister && <p className="mt-4 text-right text-sm"><Link className="font-medium text-primary hover:underline" href="/forgot-password">Forgot password?</Link></p>}

        {googleEnabled && <div className="mt-6 grid gap-5">
          <div className="flex min-w-0 items-center gap-3" role="separator" aria-label="Or continue with">
            <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-border" />
            <span className="shrink-0 text-[10px] font-medium tracking-[0.12em] text-muted-foreground sm:text-[11px]">OR CONTINUE WITH</span>
            <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-border" />
          </div>
          <div className="grid gap-3">
            <GoogleAuthForm />
            <p className="text-xs leading-relaxed text-muted-foreground">Already have an email/password account? Sign in with your password first, then link Google in Account security.</p>
          </div>
        </div>}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isRegister ? "Already have an account?" : "New to Ng Wanam?"}{" "}
          <Link className="font-medium text-primary hover:underline" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </CardContent>
      <AlertDialog open={verificationMessage !== null} onOpenChange={open => { if (!open) setVerificationMessage(null); }}>
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto">
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"><MailCheck className="size-6" /></span>
          <AlertDialogTitle>Check your email</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">{verificationMessage}</AlertDialogDescription>
          <Button type="button" className="w-full" onClick={() => setVerificationMessage(null)}>Got it</Button>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  const label = props.name === "confirmPassword" ? "confirm password" : "password";
  return (
    <div className="relative">
      <Input {...props} className={cn(authInputClass, "pr-12", props.className)} type={visible ? "text" : "password"} />
      <Button type="button" variant="ghost" size="icon" aria-label={`${visible ? "Hide" : "Show"} ${label}`} aria-controls={props.id} aria-pressed={visible}
        className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setVisible(current => !current)}>
        {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
      </Button>
    </div>
  );
}
