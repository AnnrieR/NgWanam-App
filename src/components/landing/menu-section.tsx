import { UtensilsCrossed } from "lucide-react";

import { Cta, SectionHeading, Wave, containerClass } from "@/components/landing/common";
import { MenuTabs, type MenuTabGroup } from "@/components/landing/menu-tabs";
import { Reveal } from "@/components/reveal";

export function MenuSection({ groups }: { groups: MenuTabGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section
      className="relative min-h-[20rem] scroll-mt-28 overflow-hidden bg-[#140504] pt-20 pb-32 text-center text-white"
      id="menu"
    >
      <div aria-hidden className="absolute inset-0 bg-[#400D0A]/70" />
      <Wave side="top" />
      <Wave side="bottom" />

      <div className={cnRelative(containerClass)}>
        <Reveal>
          <SectionHeading dark eyebrow="Featured Dishes" title="Our Menu" />
        </Reveal>
        <Reveal delay={100}>
          <MenuTabs groups={groups} />
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-10">
            <Cta href="/login" icon={<UtensilsCrossed className="size-5" />}>
              View the full menu
            </Cta>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function cnRelative(className: string) {
  return `relative z-10 ${className}`;
}
