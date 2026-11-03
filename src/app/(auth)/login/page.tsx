import { AuthShell } from "../auth-shell";

import { AuthForm } from "../auth-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; reset?: string }>;
};

const notices: Record<string, string> = {
  "account-inactive": "This account is inactive. Please contact Ng Wanam.",
  "confirmation-failed": "Your confirmation link is invalid or has expired.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, reset } = await searchParams;
  return (
    <AuthShell mode="login">
          <AuthForm mode="login" notice={reset ? "Password updated. Please sign in." : error ? notices[error] : undefined} />
    </AuthShell>
  );
}
