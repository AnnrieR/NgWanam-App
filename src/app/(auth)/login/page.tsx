import { AuthShell } from "../auth-shell";

import { AuthForm } from "../auth-form";
import { googleAuthEnabled } from "@/lib/google-auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; reset?: string }>;
};

const notices: Record<string, string> = {
  "email-unverified": "Verify your email using the confirmation link before signing in. Check your inbox and spam folder.",
  "account-inactive": "This account is inactive. Please contact Ng Wanam.",
  "confirmation-failed": "Your confirmation link is invalid or has expired.",
  "google-failed": "Google sign-in could not be completed. If you already have an account with this email, sign in using its password, then explicitly link Google in Account security. Google must verify the email. No additional confirmation email is needed for verified Google accounts.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, reset } = await searchParams;
  return (
    <AuthShell mode="login">
          <AuthForm mode="login" googleEnabled={googleAuthEnabled()} notice={reset ? "Password updated. Please sign in." : error ? notices[error] : undefined} />
    </AuthShell>
  );
}
