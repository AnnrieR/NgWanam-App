"use client";

import { Button } from "@/components/ui/button";

import { useState } from "react";

import { cn } from "@/lib/utils";

export type MenuTabGroup = {
  name: string;
  items: { id: string; name: string; price: string }[];
};

export function MenuTabs({ groups }: { groups: MenuTabGroup[] }) {
  const [active, setActive] = useState(0);
  const current = groups[active];

  if (!current) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center" role="tablist">
        {groups.map((group, index) => {
          const selected = index === active;
          return (
            <Button variant="ghost"
              aria-selected={selected}
              className={cn(
                "mx-1 my-1 h-auto cursor-pointer rounded-full border px-4 py-2 text-base font-bold transition-colors duration-200 focus-visible:ring-[#ffc42f]",
                selected
                  ? "border-[#ffc42f] bg-[#ffc42f] text-[#400D0A] hover:bg-[#ffd567] hover:text-[#400D0A] dark:bg-[#ffc42f] dark:text-[#400D0A] dark:hover:bg-[#ffd567]"
                  : "border-white/25 bg-transparent text-white/85 hover:bg-white/10 hover:text-white dark:bg-transparent dark:text-white/85 dark:hover:bg-white/10 dark:hover:text-white",
              )}
              key={group.name}
              role="tab"
              type="button"
              onClick={() => setActive(index)}
            >
              {group.name}
            </Button>
          );
        })}
      </div>

      <div
        className="mt-8 grid gap-x-8 text-left min-[48rem]:grid-cols-2"
        role="tabpanel"
      >
        {current.items.map((item) => (
          <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3 text-base" key={item.id}>
            <span>{item.name}</span>
            <span className="shrink-0 tabular-nums">{item.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
