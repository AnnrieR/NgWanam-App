import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

export default async function StaffMenuPage() {
  await requireRole(["staff", "admin"]);
  redirect("/menu");
}
