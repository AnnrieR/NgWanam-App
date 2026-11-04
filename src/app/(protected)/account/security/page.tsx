import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { googleAuthEnabled, verifiedGoogleIdentity } from "@/lib/google-auth";
import { GoogleAuthForm } from "@/components/google-auth-form";
import { CustomerDashboard } from "@/components/customer-dashboard";

export default async function AccountSecurity({ searchParams }: { searchParams: Promise<{ error?: string; linked?: string }> }) {
  const { user, profile } = await requireRole(["customer", "staff", "delivery", "admin"]);
  const { error, linked } = await searchParams;
  const connected = verifiedGoogleIdentity(user);
  return <CustomerDashboard avatarUrl={profile.avatar_url} fullName={profile.full_name} role={profile.role}><section className="mx-auto grid max-w-xl gap-5 p-6">
    <Link href="/account" className="text-sm underline">Back to account</Link>
    <h1 className="text-2xl font-bold">Account security</h1>
    <p>Account: {user.email}</p>
    {error && <p role="alert" className="text-destructive">We could not confirm Google authentication. Check the connection status below before retrying. Choose the same verified email and verify your existing password first.</p>}
    {linked && connected && <p role="status">Google is now linked to your existing account.</p>}
    {connected ? <p>Google sign-in is connected. Your account, role and order history are unchanged.</p> : <>
      <p>Link Google only after verifying your current password. Use the Google account with the same email. Approval expires after five minutes. No accounts or order histories will be merged.</p>
      {googleAuthEnabled() ? <GoogleAuthForm linking /> : <p>Google sign-in is not enabled yet.</p>}
      <Link href="/forgot-password" className="text-sm underline">Forgot your password? Recover your existing account first.</Link>
    </>}
  </section></CustomerDashboard>;
}
