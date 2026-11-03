import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const containerClass = "mx-auto w-full max-w-[68rem] px-3 min-[48rem]:px-4";
export const wideContainerClass = containerClass;
export const bodyTextClass = "my-6 text-xl leading-[1.5]";

export function Eyebrow({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <span className={cn("text-xs uppercase", dark ? "text-white" : "text-[#DE3021]", className)}>
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  center,
  dark,
  large,
}: {
  eyebrow: string;
  title: string;
  center?: boolean;
  dark?: boolean;
  large?: boolean;
}) {
  return (
    <div className={cn(large ? "my-14" : "my-6", center && "text-center", dark && "text-white")}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2 className="font-display text-[42px] leading-none font-normal min-[48rem]:text-[56px]">
        {title}
      </h2>
    </div>
  );
}

export function Cta({
  href,
  children,
  icon,
  className,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#DE3021] px-8 py-3 text-center text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#e14537] hover:shadow-[0_6px_16px_rgba(0,0,0,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DE3021] active:scale-[0.97] min-[48rem]:text-sm",
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

const WAVE_TOP = "M0 0V22Q90 40 180 22T360 22T540 22T720 22T900 22T1080 22T1260 22T1440 22V0Z";
const WAVE_BOTTOM = "M0 40V18Q90 0 180 18T360 18T540 18T720 18T900 18T1080 18T1260 18T1440 18V40Z";

export function Wave({ side, className }: { side: "top" | "bottom"; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-0 z-10 w-full",
        side === "top" ? "top-0 h-[35px]" : "bottom-0 h-[38px]",
        className,
      )}
    >
      <svg className="h-full w-full" viewBox="0 0 1440 40" preserveAspectRatio="none">
        {/* Tracks the page background so the seam matches in light and dark mode. */}
        <path d={side === "top" ? WAVE_TOP : WAVE_BOTTOM} fill="var(--background)" />
      </svg>
    </div>
  );
}
