/* eslint-disable @next/next/no-img-element -- Staff-configured remote URLs cannot use a fixed Next image allowlist. */

import { Cta, SectionHeading, containerClass } from "@/components/landing/common";
import { Reveal } from "@/components/reveal";

export type GalleryItem = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
};

const gradients = [
  "from-[#8B1E14] to-[#DE3021]",
  "from-[#400D0A] to-[#A62216]",
  "from-[#DE3021] to-[#7f1d1d]",
  "from-[#5C1510] to-[#e14537]",
];

export function Gallery({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="scroll-mt-28 py-16 min-[68rem]:py-20" id="gallery">
      <div className={containerClass}>
        <Reveal>
          <SectionHeading center eyebrow="Check our popular dishes" title="Gallery" />
        </Reveal>
        <div className="grid grid-cols-2 gap-2 min-[48rem]:grid-cols-3 min-[68rem]:grid-cols-4">
          {items.map((item, index) => (
            <Reveal delay={index * 70} key={item.id}>
              <div className="group relative aspect-square overflow-hidden rounded-md">
                {item.image_url ? (
                  <img
                    alt={item.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100"
                    src={item.image_url}
                  />
                ) : (
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradients[index % gradients.length]}`}
                  >
                    <span className="font-display text-6xl text-white/90 transition-transform duration-500 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/50 px-3 py-2">
                  <p className="truncate text-xs font-bold text-white">{item.name}</p>
                  <p className="truncate text-[10px] text-white/70">{item.category}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={100}>
          <div className="mt-10 text-center">
            <Cta href="/login">Browse the full menu</Cta>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
