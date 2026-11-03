import { SectionHeading, containerClass } from "@/components/landing/common";
import { Reveal } from "@/components/reveal";

type CouponCard = {
  headline: string;
  label: string;
  body: string;
  fine: string;
  footer: string;
};

export function Coupons({ hours, areas }: { hours?: string | null; areas?: string[] }) {
  const cards: CouponCard[] = [
    {
      headline: "PRE-ORDER",
      label: "Party Trays & Bilao",
      body: "Family-size pancit, grilled specialties, and salo-salo trays for gatherings.",
      fine: "Pre-order dishes need advance notice before we start preparing them.",
      footer: "Reserve by phone or online",
    },
    ...(areas && areas.length > 0
      ? [
          {
            headline: `${areas.length} AREAS`,
            label: "Delivery Service",
            body: `We deliver to ${areas.join(", ")}.`,
            fine: "Delivery areas and fees are confirmed at checkout.",
            footer: "Order online for delivery",
          } satisfies CouponCard,
        ]
      : []),
    {
      headline: "EVERY DAY",
      label: hours ?? "Call for current hours",
      body: "Walk in for takeout, or order online and we’ll deliver.",
      fine: "Holiday hours may vary — call ahead to confirm.",
      footer: "We look forward to serving you",
    },
  ];

  return (
    <section className="scroll-mt-28 pb-6 min-[48rem]:pb-10" id="coupons">
      <div className={containerClass}>
        <Reveal>
          <SectionHeading center large eyebrow="Made for every occasion" title="Latest Offers" />
        </Reveal>
        <div className="grid gap-4 min-[48rem]:grid-cols-3">
          {cards.map((card, index) => (
            <Reveal className="h-full py-6" delay={index * 80} key={card.headline}>
              <div className="flex h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.075)]">
                <div className="flex h-full w-full flex-col rounded-lg bg-white px-8 pt-6 pb-8 shadow-[0px_4px_16px_rgba(0,0,0,0.075)] dark:bg-slate-900 dark:shadow-black/30">
                  <h3 className="text-[32px] leading-tight font-bold text-[#DE3021]">{card.headline}</h3>
                  <span className="block text-base font-bold">{card.label}</span>
                  <p className="py-4 text-base">{card.body}</p>
                  <p className="text-sm opacity-80">{card.fine}</p>
                  <div className="mt-auto border-t-2 border-dashed border-[rgba(222,48,33,0.25)] pt-4 pb-2 text-center font-bold">
                    {card.footer}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
