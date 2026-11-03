import { getRestaurantInfo } from "@/lib/restaurant";
import type { CartProduct } from "@/lib/cart-catalog";
import { createClient } from "@/lib/supabase/server";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { requireRole } from "@/lib/auth";
import { loadDeliveryAreas } from "@/lib/delivery-areas";
import { managedGcashQrPath } from "@/lib/gcash-settings";

import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage() {
  const { user, profile } = await requireRole(["customer"]);
  const supabase = await createClient();
  // Payment recipients come only from dedicated admin-managed GCash settings.
  // Restaurant phone numbers must never be interpreted as payment wallets.
  const [settingsResult, restaurant, catalog, details, areas] = await Promise.all([
    supabase.rpc("get_checkout_settings"),
    getRestaurantInfo(),
    supabase.rpc("get_menu_catalog"),
    supabase.from("profiles").select("address").eq("id", user.id).single(),
    loadDeliveryAreas(supabase).then(data => ({ data, failed: false })).catch(() => ({ data: [], failed: true })),
  ]);
  const settings = Array.isArray(settingsResult.data) ? settingsResult.data[0] : null;
  const qrUrl = managedGcashQrPath(settings?.gcash_qr_path ?? null)
    ? supabase.storage.from("gcash-qr").getPublicUrl(settings.gcash_qr_path).data.publicUrl
    : settings?.gcash_qr_path ?? null;

  return (
    <CustomerDashboard avatarUrl={profile.avatar_url} fullName={profile.full_name} role={profile.role}>
      <CheckoutForm
        defaultContactName={profile.full_name}
        defaultContactPhone={profile.phone}
        defaultAddress={details.data?.address}
        deliveryAreas={areas.data}
        areasFailed={areas.failed}
        gcashQrPath={qrUrl}
        gcashAccountName={settings?.gcash_account_name ?? null}
        gcashAccountNumber={settings?.gcash_account_number ?? null}
        gcashEnabled={!settingsResult.error && settings?.gcash_enabled === true}
        pickupAddress={restaurant?.address ?? null}
        pickupHours={restaurant?.operating_hours ?? null}
        catalog={(catalog.data ?? []) as CartProduct[]}
        catalogFailed={Boolean(catalog.error)}
      />
    </CustomerDashboard>
  );
}
