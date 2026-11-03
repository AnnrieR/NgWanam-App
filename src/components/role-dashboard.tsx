"use client";

import { Button } from "@/components/ui/button";

import Link from "@/components/navigation-link";
import { Activity, BarChart3, Bot, Boxes, ClipboardList, LogOut, Menu, Package, PackageCheck, ShieldCheck, Truck, UserRound, UsersRound, Wallet, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { LogoutDialog } from "@/components/logout-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { DashboardBrand } from "@/components/dashboard-brand";
import { NotificationBell } from "@/components/notification-bell";

type Role = "staff" | "delivery" | "admin";

const navigation = {
  staff: [
    { href: "/staff", label: "Dashboard", icon: ClipboardList },
    // Staff spend the day processing orders and counting stock, so those two
    // sit ahead of catalog maintenance.
    { href: "/staff/orders", label: "Orders", icon: Package },
    { href: "/staff/inventory", label: "Inventory", icon: Boxes },
    { href: "/menu", label: "Menu", icon: PackageCheck },
    { href: "/staff/payments", label: "Payments", icon: Wallet },
    { href: "/staff/delivery", label: "Delivery", icon: Truck },
    { href: "/account", label: "Profile", icon: UserRound },
  ],
  delivery: [
    // Riders were told not to get a dashboard of their own — the delivery
    // queue is the whole job, so it is the first and primary entry.
    { href: "/delivery/orders", label: "Deliveries", icon: Truck },
    { href: "/account", label: "Profile", icon: UserRound },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: ShieldCheck },
    { href: "/admin/users", label: "User Management", icon: UsersRound },
    { href: "/menu", label: "Menu Management", icon: PackageCheck },
    { href: "/admin/inventory", label: "Inventory Management", icon: Boxes },
    { href: "/admin/orders", label: "Orders & Monitoring", icon: Package },
    { href: "/admin/payments", label: "Payments Monitoring", icon: Wallet },
    { href: "/admin/delivery", label: "Delivery Monitoring", icon: Truck },
    { href: "/admin/delivery-areas", label: "Delivery Areas & Fees", icon: Truck },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/activity", label: "Activity Logs", icon: Activity },
    { href: "/admin/faq", label: "Chatbot FAQ", icon: Bot },
    { href: "/admin/settings", label: "Admin Settings", icon: Wallet },
    { href: "/account", label: "Profile", icon: UserRound },
  ],
} as const;

export function RoleDashboard({ children, fullName, role, deliveryAssignments = 0 }: { children: React.ReactNode; fullName: string | null; role: Role; deliveryAssignments?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [assignmentCount, setAssignmentCount] = useState(deliveryAssignments);
  const name = fullName || (role === "staff" ? "Staff" : role === "delivery" ? "Delivery personnel" : "Administrator");
  const initial = name.trim().charAt(0).toUpperCase();

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (role !== "delivery") return;
    let disposed = false;
    const supabase = createClient();
    const refresh = async () => {
      if (document.hidden) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || disposed) return;
      const { count, error } = await supabase.from("deliveries").select("id, orders!inner(status)", { count: "exact", head: true }).eq("assigned_to", user.id).eq("status", "assigned").eq("orders.status", "ready");
      if (!disposed && !error) setAssignmentCount(count ?? 0);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [role, deliveryAssignments]);

  return (
    <div className="font-dashboard min-h-dvh bg-slate-100 dark:bg-slate-950 xl:h-dvh xl:p-3">
      <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col bg-[#fafafa] text-slate-900 dark:bg-slate-900 dark:text-slate-100 xl:h-[calc(100dvh-1.5rem)] xl:min-h-0 xl:overflow-hidden xl:rounded-2xl xl:shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
      <header className="z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <Button variant="ghost" aria-label="Open dashboard menu" className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setOpen(true)} type="button"><Menu className="size-5" /></Button>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{role === "delivery" ? "Rider workspace" : role === "admin" ? "Admin workspace" : "Staff workspace"}</p>
         <div className="ml-auto flex items-center gap-2 sm:gap-3"><NotificationBell role={role} /><ThemeToggle /><Link href="/account" className="hidden items-center gap-3 sm:flex"><span className="grid size-8 place-items-center rounded-full bg-red-100 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">{initial}</span><span className="text-sm font-medium">{name}</span></Link><Button type="button" variant="ghost" size="icon" aria-label="Log out" title="Log out" className="shrink-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" onClick={() => { setOpen(false); setConfirmSignOut(true); }}><LogOut aria-hidden="true" className="size-5" /></Button></div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div aria-hidden={!open} className={cn("fixed inset-0 z-40 bg-slate-950/30 dark:bg-black/60 lg:hidden", open ? "block" : "hidden")} onClick={() => setOpen(false)} />
        <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-slate-100 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:h-full lg:shrink-0 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
          <div className="mb-6 flex items-center justify-between lg:hidden"><span className="text-sm font-semibold">Menu</span><Button variant="ghost" aria-label="Close dashboard menu" className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen(false)} type="button"><X className="size-5" /></Button></div>
          <DashboardBrand href={role === "staff" ? "/staff" : role === "delivery" ? "/delivery/orders" : "/admin"} />
          <nav aria-label={`${role} dashboard`} className="shrink-0 space-y-1">
            {navigation[role].map(({ href, label, icon: Icon }) => {
              const [path, fragment] = href.split("#");
              const active = (pathname === path && (fragment ? hash === `#${fragment}` : !hash)) || (role === "admin" && path === "/menu" && pathname === "/admin/menu");
              return <Link aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium", active ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800")} href={href} key={href} onClick={() => setOpen(false)}><Icon className="size-4 shrink-0" />{label}{role === "delivery" && href === "/delivery/orders" && assignmentCount > 0 && <span aria-label={`${assignmentCount} assignments awaiting pick-up`} className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{assignmentCount}</span>}</Link>;
            })}
          </nav>
          <div className="mt-auto shrink-0 space-y-2 pt-4">
            <Link className="block rounded-lg bg-gradient-to-br from-red-700 to-red-600 p-5 text-sm text-white" href="/"><p className="font-semibold">Back to website</p><p className="mt-1 text-xs text-white/80">View Ng Wanam&apos;s public home page.</p></Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:overflow-y-auto lg:p-8">{children}</main>
      </div>
      </div>

      {confirmSignOut && <LogoutDialog onClose={() => setConfirmSignOut(false)} />}
    </div>
  );
}
