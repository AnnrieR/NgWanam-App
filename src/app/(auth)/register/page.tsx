import { AuthShell } from "../auth-shell";

import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  return (
    <AuthShell mode="register">
          <AuthForm mode="register" />
    </AuthShell>
  );
}
