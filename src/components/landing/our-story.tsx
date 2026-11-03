import Image from "next/image";
import { SectionHeading, bodyTextClass, containerClass } from "@/components/landing/common";
import { Reveal } from "@/components/reveal";

export function OurStory() {
  return (
    <section className="scroll-mt-28" id="ourstory">
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-8 py-16 min-[48rem]:flex-row min-[48rem]:gap-10 min-[68rem]:py-[120px]">
          <Reveal className="relative hidden min-[48rem]:mr-10 min-[48rem]:block min-[48rem]:w-2/5">
            <div className="relative z-[1] grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border border-[#ffc42f]/20 bg-[#400D0A] p-8 shadow-xl shadow-black/10">
              <Image src="/menu-images/ng wanam logo.png" alt="Ng Wanam Food House logo" width={2000} height={2000} sizes="(min-width: 768px) 400px, 80vw" className="h-auto w-full object-contain" />
            </div>
          </Reveal>

          <Reveal className="w-full min-[48rem]:w-3/5">
            <SectionHeading eyebrow="Where we started" title="Our Story" />
            <p className={bodyTextClass}>
              Opened in June 2014, Ng Wanam is proudly owned by Lily Atienza, daughter of the owner of the
              original San Wanam Restaurant, carrying on a family tradition of serving delicious and
              authentic Filipino food.
            </p>
            <p className={bodyTextClass}>
              Inspired by the legacy of &ldquo;The Original and Best Pancit in Town,&rdquo; Ng Wanam
              continues to bring families and friends together through its signature pancit, grilled
              specialties, and Filipino favorites. From everyday meals to special celebrations, we remain
              dedicated to serving quality food, generous portions, and the familiar taste of home.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
