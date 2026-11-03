import { CustomerDashboard } from "@/components/customer-dashboard";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CustomerHome, type HomeVariant } from "./customer-home";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await requireRole(["customer"]);
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_menu_catalog");
  return (
    <CustomerDashboard fullName={profile.full_name} avatarUrl={profile.avatar_url} role={profile.role}>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700 dark:bg-red-950 dark:text-red-300">Unable to load the menu. Please refresh and try again.</p>
        : <CustomerHome name={profile.full_name || "Customer"} query={(q ?? "").slice(0, 100)} variants={(data ?? []) as HomeVariant[]} />}
    </CustomerDashboard>
  );
}
