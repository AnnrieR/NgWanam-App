"use client";

import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function DisclosureSummary(props: React.HTMLAttributes<HTMLElement>) { void props; return null; }
export function Disclosure({ children, open, className, id }: React.DetailsHTMLAttributes<HTMLDetailsElement>) {
  const nodes = React.Children.toArray(children);
  // RSC client references may arrive as lazy element types; summary is always
  // the first declarative child, so do not compare client component identities.
  const summary = nodes.find(React.isValidElement) as React.ReactElement<React.HTMLAttributes<HTMLElement>> | undefined;
  return <Collapsible defaultOpen={open} className={className} id={id}>
    <CollapsibleTrigger render={<Button type="button" variant="ghost" className={cn("h-auto w-full justify-start gap-3 rounded-none text-left whitespace-normal [&[aria-expanded=true]>svg:last-child]:rotate-180", summary?.props.className)} />}>
      {summary?.props.children}<ChevronDown aria-hidden="true" className="ml-auto size-4 shrink-0 text-red-500 transition-transform" />
    </CollapsibleTrigger>
    <CollapsibleContent>{nodes.filter(node => node !== summary)}</CollapsibleContent>
  </Collapsible>;
}
