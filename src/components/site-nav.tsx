"use client";

import { Button } from "@/components/ui/button";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Phone, ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { RestaurantInfo } from "@/lib/restaurant";
import { wideContainerClass } from "@/components/landing/common";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/** Bright icon: this bar keeps the brand brown background in both themes. */
const navToggleClass =
  "text-white/85 hover:bg-white/10 hover:text-white dark:text-white/85 dark:hover:bg-white/10";

const navLinks = [
  { href: "/#home", label: "Home" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#ourstory", label: "Our Story" },
];

export function SiteNav({ restaurant }: { restaurant: RestaurantInfo | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const firstPhone = restaurant?.phone_numbers?.[0];
  const phoneHref = firstPhone ? `tel:${firstPhone.replaceAll(/[^\d+]/g, "")}` : null;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="relative bg-[#400D0A] text-white">
        <div className={cn(wideContainerClass, "flex h-16 items-center justify-between")}>
          <div className="flex items-center gap-1 lg:hidden">
            <Button variant="ghost"
              aria-label="Open menu"
              className="p-2 transition-opacity hover:opacity-70"
              type="button"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-8" />
            </Button>
            {phoneHref && (
              <a aria-label="Call us" className="p-2 transition-opacity hover:opacity-70" href={phoneHref}>
                <Phone className="size-7" />
              </a>
            )}
          </div>

          <ul className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  aria-current={pathname === "/" && link.label === "Home" ? "page" : undefined}
                  className="text-xs font-bold tracking-wide uppercase transition-opacity hover:opacity-70"
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Brand mark sits between the nav and the actions on every viewport. */}
          <Link aria-label="Ng Wanam Food House - home" className="flex shrink-0 items-center" href="/">
            <Image
              alt="Ng Wanam Food House"
              className="h-9 w-auto"
              height={48}
              priority
              src="/menu-images/ng wanam logo.png"
              width={130}
            />
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle className={navToggleClass} />
            <Link aria-label="Sign in to view your cart" className="inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase transition-opacity hover:opacity-70" href="/login">
              <ShoppingCart className="size-4" /> Cart
            </Link>
            <Link className="text-xs font-bold tracking-wide uppercase transition-opacity hover:opacity-70" href="/login">
              Sign in
            </Link>
          </div>

          <div className="flex w-16 items-center justify-end lg:hidden" />
        </div>

      </div>

      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        aria-label="Site menu"
        aria-modal={open}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[70%] max-w-[23rem] flex-col bg-[#400D0A] px-6 pt-6 pb-8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        inert={!open}
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <Link aria-label="Ng Wanam Food House - home" className="flex shrink-0 items-center" href="/" onClick={() => setOpen(false)}>
            <Image alt="Ng Wanam Food House" className="h-9 w-auto" height={48} src="/menu-images/ng wanam logo.png" width={130} />
          </Link>
          <Button variant="ghost" aria-label="Close menu" className="p-2 transition-opacity hover:opacity-70" type="button" onClick={() => setOpen(false)}>
            <X className="size-7" />
          </Button>
        </div>
        <nav className="mt-4 flex flex-col">
          {navLinks.map((link) => (
            <Link
              className="rounded px-3 py-3 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-white/5"
              href={link.href}
              key={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            className="rounded px-3 py-3 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-white/5"
            href="/login"
            onClick={() => setOpen(false)}
          >
            Sign in
          </Link>
          <Link
            className="rounded px-3 py-3 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-white/5"
            href="/login"
            onClick={() => setOpen(false)}
          >
            Cart
          </Link>
          <div className="flex items-center justify-between rounded px-3 py-3">
            <span className="text-sm font-bold tracking-wide uppercase">Appearance</span>
            <ThemeToggle className={navToggleClass} />
          </div>
        </nav>
        <div className="mt-auto">
          <Link
            className="block rounded-full bg-[#DE3021] px-8 py-3 text-center text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#e14537] active:scale-[0.97]"
            href="/login"
            onClick={() => setOpen(false)}
          >
            Order Online
          </Link>
        </div>
      </aside>
    </header>
  );
}
