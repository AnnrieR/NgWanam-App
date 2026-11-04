import { AuthShell } from "../auth-shell";

import { AuthForm } from "../auth-form";
import { googleAuthEnabled } from "@/lib/google-auth";

// The Google feature switch is runtime configuration, not a build-time snapshot.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <AuthShell mode="register">
          <AuthForm mode="register" googleEnabled={googleAuthEnabled()} />
    </AuthShell>
  );
}
