"use client";

import { Button } from "@/components/ui/button";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SectionHeading, containerClass } from "@/components/landing/common";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

export type Testimonial = { quote: string; name: string; role: string };

const QuoteGlyph = () => (
  <svg aria-hidden className="relative -top-4 h-[54px] w-[36px] fill-[#DE3021]" viewBox="0 0 36 54">
    <path d="M0 20c0-11 6-18 17-20l2 5c-6 1.5-9 5-9 10h7v15H0V20zm0 30c0-11 6-18 17-20l2 5c-6 1.5-9 5-9 10h7v9H0V50z" />
  </svg>
);

export function Reviews({ testimonials }: { testimonials: Testimonial[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      setPages(Math.max(1, Math.ceil(el.scrollWidth / Math.max(1, el.clientWidth))));
      setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function scrollByPage(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  function scrollToPage(index: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  return (
    <section className="scroll-mt-28 pb-16 min-[48rem]:pb-20" id="reviews">
      <div className={containerClass}>
        <Reveal>
          <SectionHeading center large eyebrow="What our customers say" title="Testimonials" />
        </Reveal>

        <Reveal delay={100}>
          <div className="relative flex items-center gap-4">
            <Button variant="ghost"
              aria-label="Previous testimonials"
              className="hidden size-12 shrink-0 cursor-pointer rounded-full bg-[rgba(222,48,33,0.08)] transition-colors duration-200 hover:bg-[rgba(222,48,33,0.16)] disabled:cursor-default disabled:opacity-40 min-[48rem]:flex min-[48rem]:items-center min-[48rem]:justify-center"
              disabled={page === 0}
              type="button"
              onClick={() => scrollByPage(-1)}
            >
              <ChevronLeft className="size-5" />
            </Button>

            <div
              className="flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={() => {
                const el = trackRef.current;
                if (!el) return;
                setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
              }}
              ref={trackRef}
            >
              <div className="flex">
                {testimonials.map((testimonial, index) => (
                  <div className="w-full shrink-0 snap-start px-4" key={`${testimonial.name}-${index}`}>
                    <div className="my-6 rounded-lg bg-white px-8 pt-2 pb-10 shadow-[0px_4px_16px_rgba(0,0,0,0.075)] dark:bg-slate-900 dark:shadow-black/30">
                      <QuoteGlyph />
                      <p className="text-xl leading-[1.5]">{testimonial.quote}</p>
                      <p className="mt-4 text-xl leading-[1.5]">
                        <strong className="mr-2 text-[#DE3021]">{testimonial.name}</strong>
                        <span>{testimonial.role}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="ghost"
              aria-label="Next testimonials"
              className="hidden size-12 shrink-0 cursor-pointer rounded-full bg-[rgba(222,48,33,0.08)] transition-colors duration-200 hover:bg-[rgba(222,48,33,0.16)] disabled:cursor-default disabled:opacity-40 min-[48rem]:flex min-[48rem]:items-center min-[48rem]:justify-center"
              disabled={page >= pages - 1}
              type="button"
              onClick={() => scrollByPage(1)}
            >
              <ChevronRight className="size-5" />
            </Button>

            <div className="absolute inset-x-0 -bottom-10 flex justify-center">
              {Array.from({ length: pages }).map((_, index) => (
                <Button variant="ghost"
                  aria-label={`Go to testimonials page ${index + 1}`}
                  className="cursor-pointer p-4"
                  key={index}
                  type="button"
                  onClick={() => scrollToPage(index)}
                >
                  <span
                    className={cn(
                      "block size-2 rounded-full transition-colors duration-200",
                      index === page ? "bg-[#DE3021]" : "bg-[rgba(222,48,33,0.2)] hover:bg-[rgba(222,48,33,0.4)]",
                    )}
                  />
                </Button>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
