"use client";

/* eslint-disable @next/next/no-img-element -- Staff-configured remote URLs cannot use a fixed Next image allowlist. */

import { UtensilsCrossed } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** Fixed 16:9 frame so cards without a photo keep the same height as the rest. */
const frameClass = "relative aspect-[16/9] w-full overflow-hidden rounded-t-xl";

/**
 * Staff only fill in `image_url` for some items, so every item still needs a
 * presentable cover. The same component also covers a broken or moved URL —
 * `onError` swaps the failed photo for the placeholder instead of leaving a
 * broken-image icon on the customer menu.
 */
export function MenuImage({
  className,
  name,
  src,
}: {
  className?: string;
  name: string;
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <div className={cn(frameClass, className)}>
        <img
          alt={name}
          className="h-full w-full object-cover"
          src={src}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "N";

  return (
    <div
      aria-hidden
      className={cn(
        frameClass,
        "grid place-items-center bg-[linear-gradient(135deg,#8B1E14_0%,#DE3021_100%)] text-white",
        className,
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_65%)]" />
      <span className="relative flex flex-col items-center">
        <span className="font-display text-5xl leading-none">{initial}</span>
        <span className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/75">
          <UtensilsCrossed className="size-3" />
          Ng Wanam
        </span>
      </span>
    </div>
  );
}
