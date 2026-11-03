"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/** Keep Next's prefetching and modifier-key behavior; announce real navigations. */
export default function NavigationLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} onNavigate={(event) => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (prevented) return;
    const href = typeof props.href === "string" ? props.href : props.href.pathname;
    if (href && new URL(href, window.location.href).pathname !== window.location.pathname) {
      window.dispatchEvent(new Event("ng-wanam-navigation-start"));
    }
  }} />;
}
