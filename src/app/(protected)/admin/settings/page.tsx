import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { managedGcashQrPath } from "@/lib/gcash-settings";
import { GcashSettingsForm } from "./gcash-settings-form";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  await requireRole(["admin"]);
  const { updated } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("restaurant_settings")
    .select("gcash_account_name, gcash_account_number, gcash_enabled, gcash_qr_path, updated_at").eq("id", true).single();
  const qrUrl = managedGcashQrPath(data?.gcash_qr_path ?? null)
    ? supabase.storage.from("gcash-qr").getPublicUrl(data!.gcash_qr_path).data.publicUrl
    : data?.gcash_qr_path || null;
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">Admin Settings</h1><p className="mt-2 text-sm text-muted-foreground">Manage the restaurant&apos;s manual GCash payment destination.</p></header>
    {updated === "gcash" && <p role="status" className="rounded-xl border border-green-600 p-4 text-sm">GCash payment settings saved. Checkout now uses these dedicated payment details.</p>}
    <section className="rounded-xl border bg-card p-5 sm:p-6"><h2 className="mb-2 text-xl font-semibold">GCash Payment</h2><p className="mb-6 text-sm leading-6 text-muted-foreground">Account name and number are required to enable GCash. A QR image is optional. Payments still require staff verification; COD remains available.</p>
      {error || !data ? <p role="alert">GCash settings could not be loaded. Refresh or check that the latest migrations have been applied.</p> : <GcashSettingsForm key={data.updated_at} settings={data} qrUrl={qrUrl} />}
    </section>
  </div>;
}
