"use client";

import { Form } from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";

import Link from "@/components/navigation-link";
import { Bot, ClipboardList, House, LogOut, Menu, Search, ShoppingCart, Truck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LogoutDialog } from "@/components/logout-dialog";
import { RoleDashboard } from "@/components/role-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCart } from "@/hooks/use-cart";
import { DashboardBrand } from "@/components/dashboard-brand";
import { NotificationBell } from "@/components/notification-bell";

/**
 * Customer shopping lives at `/home`; `/menu` stays staff/admin CRUD.
 */
const links = [
  { href: "/home", label: "Home", icon: House },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/account", label: "Profile", icon: UserRound },
];

export function CustomerDashboard({
  children,
  fullName,
  role = "customer",
  avatarUrl,
}: {
  children: React.ReactNode;
  fullName: string | null;
  role?: AppRole;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const { cart } = useCart();
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const [open, setOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);


  if (role !== "customer") {
    return <RoleDashboard fullName={fullName} role={role}>{children}</RoleDashboard>;
  }

  const firstName = fullName?.trim().split(/\s+/)[0] || "Customer";
  const initial = firstName[0].toUpperCase();

  return (
    <div className="font-dashboard min-h-dvh bg-slate-100 dark:bg-slate-950 xl:h-dvh xl:overflow-hidden xl:p-3">
      <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col bg-[#fafafa] text-slate-900 dark:bg-slate-900 dark:text-slate-100 xl:h-[calc(100dvh-1.5rem)] xl:min-h-0 xl:overflow-hidden xl:rounded-2xl xl:shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
      <header className="z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <Button variant="ghost" aria-label="Open dashboard menu" className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setOpen(true)} type="button"><Menu className="size-5" /></Button>
        <Form action="/home" method="get" role="search" className="mx-4 hidden max-w-xl flex-1 items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800 md:flex">
          <Search className="size-4 text-slate-400" />
          <Input aria-label="Search food" name="q" type="search" placeholder="Search for food, combos, or categories..." className="w-full bg-transparent text-sm outline-none" />
        </Form>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <NotificationBell role="customer" />
          <ThemeToggle />
          <Link href="/cart" className="relative flex items-center gap-2 px-3 py-2 text-sm font-semibold">
            <ShoppingCart className="size-5" />Cart
            {cartCount > 0 && <span className="absolute -top-1 left-5 rounded-full bg-red-600 px-1.5 text-[10px] text-white" aria-label={`${cartCount} items in cart`}>{cartCount}</span>}
          </Link>
           <Link className="hidden items-center gap-2 border-l border-slate-100 pl-3 text-sm dark:border-slate-800 sm:flex" href="/account">
            {avatarUrl ? (
              /* eslint-disable @next/next/no-img-element -- profile photos come from Supabase Storage */
              <img alt="" className="size-8 rounded-full object-cover" src={avatarUrl} />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-red-100 font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">{initial}</span>
            )}
            <span>{fullName || firstName}<small className="block text-xs text-slate-500 dark:text-slate-400">Customer</small></span>
          </Link>
          <Button type="button" variant="ghost" size="icon" aria-label="Log out" title="Log out" className="shrink-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" onClick={() => { setOpen(false); setConfirmSignOut(true); }}><LogOut aria-hidden="true" className="size-5" /></Button>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1">
        <div aria-hidden={!open} className={cn("fixed inset-0 z-40 bg-slate-950/30 dark:bg-black/60 lg:hidden", open ? "block" : "hidden")} onClick={() => setOpen(false)} />
        <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-slate-100 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:h-full lg:shrink-0 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
          <div className="mb-6 flex items-center justify-between lg:hidden"><span className="text-sm font-semibold">Menu</span><Button variant="ghost" aria-label="Close dashboard menu" className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen(false)} type="button"><X className="size-5" /></Button></div>
           <DashboardBrand href="/home" />
          <nav aria-label="Customer dashboard" className="space-y-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href === "/orders" && pathname.startsWith("/orders/")) ||
                (href === "/cart" && pathname === "/checkout");
              return <Link className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium", active ? "bg-orange-50 text-red-600 dark:bg-red-950/60 dark:text-red-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800")} href={href} key={href} onClick={() => setOpen(false)}><Icon className="size-5" />{label}{href === "/cart" && cartCount > 0 && <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{cartCount}</span>}</Link>;
            })}
            <Link className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium", pathname === "/chatbot" ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800")} href="/chatbot" onClick={() => setOpen(false)}><Bot className="size-5 text-red-600 dark:text-red-400" />Ng Wanam Assist</Link>
          </nav>
          <div className="mt-auto space-y-2">
            <div className="mt-8 rounded-2xl bg-gradient-to-br from-red-700 to-orange-600 p-5 text-white"><Truck className="mb-3 size-9" /><p className="font-bold">We deliver deliciousness!</p><p className="mt-2 text-xs text-white/90">Fast, hot, and right to your door.</p></div>
            <Link className="block rounded-lg bg-gradient-to-br from-red-700 to-red-600 p-5 text-sm text-white" href="/"><p className="font-semibold">Back to website</p><p className="mt-1 text-xs text-white/80">View Ng Wanam&apos;s public home page.</p></Link>
          </div>
        </aside>
        <main className="min-h-0 min-w-0 flex-1 p-4 sm:p-6 lg:p-8 xl:overflow-y-auto">{children}</main>
      </div>
      </div>

      {confirmSignOut && <LogoutDialog onClose={() => setConfirmSignOut(false)} />}
    </div>
  );
}
