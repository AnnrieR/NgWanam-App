import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({ children, mode }: { children: ReactNode; mode: "login" | "register" }) {
  return (
    <main className="min-h-dvh bg-[#faf5ee] p-4 dark:bg-background sm:p-8">
      <div className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to website
        </Link>
        <ThemeToggle />
      </div>
      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-6xl overflow-hidden rounded-3xl border border-black/5 bg-background shadow-xl shadow-[#400d0a]/10 dark:border-border dark:shadow-black/30 lg:grid-cols-[1fr_1fr]">
        <section className="relative isolate hidden flex-col justify-between gap-12 overflow-hidden bg-[radial-gradient(ellipse_at_30%_10%,#d63b0d_0%,#a71c04_55%,#400d0a_100%)] p-10 text-white lg:flex xl:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 -bottom-28 -z-10 size-[26rem] rounded-full border-[45px] border-[#ffc42f]/10" />
          <Link href="/" className="flex w-fit items-center gap-3">
            <Image src="/landing/brand-mark.webp" alt="" width={56} height={56} className="size-14 object-contain" />
            <span className="text-sm font-bold tracking-[0.2em] text-[#ffc42f]">NG WANAM<br /><span className="text-[10px] tracking-[0.25em] text-white/75">FOOD HOUSE</span></span>
          </Link>
          <div>
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-[#ffc42f] uppercase"><UtensilsCrossed aria-hidden="true" className="size-4" /> A taste of home, since 2014</p>
            <h1 className="font-display text-5xl leading-[1.1] text-[#ffc42f] xl:text-6xl">{mode === "login" ? <>Good food,<br />right at home.</> : <>Your favorites,<br />one order away.</>}</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-white/85">{mode === "login" ? "Sign in to order your favorites and follow every delivery from the kitchen to your door." : "Create your account to order home-style Filipino favorites and follow your delivery."}</p>
          </div>
          <div className="border-t border-white/20 pt-6">
            <p className="text-lg font-semibold text-[#ffc42f]">The Original and Best Pancit in Town</p>
            <p className="mt-2 text-sm text-white/75">Home-style Filipino food in Batangas City.</p>
          </div>
        </section>
        <section aria-label={mode === "login" ? "Sign in" : "Create account"} className="flex items-center justify-center bg-background px-5 py-9 sm:px-10 lg:py-12">
          {children}
        </section>
      </div>
    </main>
  );
}
