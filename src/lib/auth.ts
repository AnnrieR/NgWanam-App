import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type AppRole = "customer" | "staff" | "delivery" | "admin";

export function roleHome(role: AppRole) {
  switch (role) {
    case "customer":
      return "/home";
    case "staff":
      return "/staff";
    case "delivery":
      return "/delivery/orders";
    case "admin":
      return "/admin";
  }
}

// React cache is request-scoped: layout/page/action callers share the same
// lookup without caching an account or its authorization across requests.
const sessionProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, is_active, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=account-inactive");
  }

  const role = profile.role as AppRole;
  return { user, profile: { ...profile, role } };
});

export async function requireRole(allowedRoles: AppRole[]) {
  const session = await sessionProfile();
  const role = session.profile.role;
  // Administrators manage every operational area, including the customer flow.
  if (role !== "admin" && !allowedRoles.includes(role)) {
    redirect(roleHome(role));
  }

  return session;
}
