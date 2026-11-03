import type { CartProduct } from "@/lib/cart-catalog";
import { createClient } from "@/lib/supabase/server";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { requireRole } from "@/lib/auth";

import { CartView } from "./cart-view";

export default async function CartPage() {
  const { profile } = await requireRole(["customer"]);
  const supabase = await createClient();
  // Item subtotal uses live prices. The area-specific fee is chosen at checkout.
  const catalog = await supabase.rpc("get_menu_catalog");

  return (
    <CustomerDashboard fullName={profile.full_name} role={profile.role} avatarUrl={profile.avatar_url}>
      <CartView catalog={(catalog.data ?? []) as CartProduct[]} catalogFailed={Boolean(catalog.error)} />
    </CustomerDashboard>
  );
}
