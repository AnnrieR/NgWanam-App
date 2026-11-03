import { Smartphone } from "lucide-react";
import Image from "next/image";

import { Cta, SectionHeading, bodyTextClass, containerClass } from "@/components/landing/common";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

export type OrderSample = { id: string; name: string; price: string };

export function OrderOnline({ samples }: { samples: OrderSample[] }) {
  return (
    <section className="scroll-mt-28" id="orderonline">
      <div className={containerClass}>
        <div className="my-16 flex flex-col items-center min-[68rem]:my-[120px] min-[68rem]:flex-row">
          <Reveal className="relative mb-20 w-full min-[68rem]:mb-0 min-[68rem]:mr-12 min-[68rem]:w-[46%]">
            <div className="absolute -bottom-20 -left-14 z-[3] hidden w-[38%] min-[76rem]:block">
              <div className="flex aspect-square -rotate-6 items-center justify-center rounded-full bg-[#DE3021] font-display text-3xl text-white drop-shadow-[-16px_16px_32px_rgba(0,0,0,0.35)]">
                <Image src="/landing/brand-mark.webp" alt="Ng-Wanam logo" width={96} height={96} className="size-[58%] object-contain" />
              </div>
            </div>

            <div className="relative mx-auto w-full min-[48rem]:w-[90%] min-[68rem]:w-[34rem]">
              <div className="w-[89%] overflow-hidden rounded-md bg-white shadow-[0px_16px_48px_rgba(0,0,0,0.08)] dark:bg-slate-900 dark:shadow-black/40">
                <div className="flex items-center gap-1.5 bg-stone-100 px-3 py-2 dark:bg-slate-800">
                  <span className="size-2.5 rounded-full bg-red-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 rounded bg-white px-2 py-0.5 text-[10px] text-stone-500 dark:bg-slate-950 dark:text-slate-400">
                    ngwanam.app/menu
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  <p className="font-display text-lg leading-none text-stone-900 dark:text-stone-100">Ng Wanam</p>
                  {samples.length > 0 ? (
                    samples.map((sample) => (
                      <div className="flex justify-between gap-3 border-b border-stone-100 pb-2 text-sm dark:border-slate-800" key={sample.id}>
                        <span className="truncate text-stone-700 dark:text-slate-300">{sample.name}</span>
                        <span className="shrink-0 font-semibold text-[#DE3021]">{sample.price}</span>
                      </div>
                    ))
                  ) : (
                    <p className="border-b border-stone-100 pb-2 text-sm text-stone-500 dark:border-slate-800 dark:text-slate-400">Browse today’s menu</p>
                  )}
                  <div className="w-max rounded-full bg-[#DE3021] px-5 py-2 text-center text-xs font-bold text-white">
                    Order now
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-[10%] right-0 z-[1] w-1/4 overflow-hidden rounded-md bg-stone-950 p-1.5 shadow-[0px_16px_48px_rgba(0,0,0,0.2)] ring-1 ring-black/10 dark:bg-black dark:ring-white/10">
                <div className="rounded-sm bg-white p-2 dark:bg-slate-900">
                  <div className="rounded-sm bg-[#DE3021] px-1.5 py-1 text-center text-[8px] font-bold text-white">
                    NG WANAM
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {samples.slice(0, 2).map((sample) => (
                      <div className="truncate rounded bg-stone-100 px-1.5 py-1 text-[7px] text-stone-700 dark:bg-slate-800 dark:text-slate-300" key={sample.id}>
                        {sample.name}
                      </div>
                    ))}
                    <div className="rounded bg-[#DE3021] px-1.5 py-1 text-center text-[7px] font-bold text-white">
                      Order
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal className={cn("w-full text-center min-[68rem]:w-[54%]")} delay={150}>
            <SectionHeading center eyebrow="For delivery or pre-order" title="Order Online" />
            <p className={cn(bodyTextClass, "min-[68rem]:mt-6")}>
              Fast and easy ordering from your computer or phone.
            </p>
            <Cta href="/login" icon={<Smartphone className="size-5" />}>
              Try it now
            </Cta>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
