import Link from "next/link";
import { MapPin, Phone } from "lucide-react";

import { getWeeklyHours } from "@/lib/hours";
import type { RestaurantInfo } from "@/lib/restaurant";
import { containerClass } from "@/components/landing/common";
import { cn } from "@/lib/utils";

const footerLinks = [
  { href: "/#home", label: "Home" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#ourstory", label: "Our Story" },
  { href: "/#menu", label: "Menu" },
];

function FooterLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-sm font-normal tracking-wide uppercase opacity-60">{children}</span>;
}

export async function SiteFooter({ restaurant }: { restaurant: RestaurantInfo | null }) {
  const address = restaurant?.address;
  const phones = restaurant?.phone_numbers ?? [];
  const weekly = getWeeklyHours(restaurant?.operating_hours);

  return (
    <footer className="mt-14 bg-[#400D0A] text-white" id="footer">
      <div className={containerClass}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-14 lg:grid-cols-[auto_12%_25%_1fr]">
          <div className="order-4 col-span-2 text-center lg:order-1 lg:col-span-1 lg:text-left">
            <Link
              className="inline-block w-44 rounded-md bg-[#DE3021] px-4 py-4 text-center transition-transform duration-200 ease-out origin-top hover:-translate-y-0.5"
              href="/#home"
              title="Go to top"
            >
              <span className="block font-display text-2xl leading-none">NG WANAM</span>
              <span className="mt-1 block text-[9px] font-bold tracking-[0.25em] uppercase opacity-90">
                Food House
              </span>
            </Link>
            {restaurant?.facebook_url && (
              <div className="mt-4 flex justify-center lg:justify-start">
                <a
                  aria-label="Facebook"
                  className="inline-block p-1 opacity-80 transition-opacity hover:opacity-100"
                  href={restaurant.facebook_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <svg aria-hidden className="size-6 fill-white" viewBox="0 0 264 512">
                    <path d="M200.8 0H63.2C28.3 0 0 28.3 0 63.2v385.6C0 483.7 28.3 512 63.2 512h106.9v-168.5h-41.6v-59.9h41.6v-44.5c0-48.7 24.3-75.6 76.4-75.6 21.7 0 38.7 1.6 43.9 2.3v54.6h-30.1c-23.5 0-28 11.2-28 27.7v35.1h56.1l-7.3 59.9h-48.8V512h95.8c34.9 0 63.2-28.3 63.2-63.2V63.2C264 28.3 235.7 0 200.8 0z" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          <div className="order-1 lg:order-2">
            <FooterLabel>Navigation</FooterLabel>
            <ul className="mt-2">
              {footerLinks.map(link => (
                <li key={link.href}>
                  <Link className="inline-block py-1 text-base text-white no-underline transition-opacity hover:opacity-70" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-2 min-w-0 lg:order-3">
            <FooterLabel>Find Us</FooterLabel>
            <div className="mt-2 space-y-3">
              {address ? (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-5 shrink-0 opacity-60" />
                  <a
                    className="break-words text-white no-underline transition-opacity hover:opacity-70"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {address}
                  </a>
                </div>
              ) : (
                <p className="text-sm opacity-70">Contact us for details.</p>
              )}
              {phones.map((phone) => (
                <div className="flex items-center gap-2 text-sm" key={phone}>
                  <Phone className="size-5 shrink-0 opacity-60" />
                  <a
                    className="text-white no-underline transition-opacity hover:opacity-70"
                    href={`tel:${phone.replaceAll(/[^\d+]/g, "")}`}
                  >
                    {phone}
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="order-3 col-span-2 min-w-0 lg:order-4 lg:col-span-1">
            <FooterLabel>Open Hours</FooterLabel>
            <div className="mt-2">
              {weekly ? (
                weekly.map((row) => (
                  <div
                    className="flex justify-between gap-4 border-b border-white/10 py-1 text-base"
                    key={row.day}
                  >
                    <span>{row.day}</span>
                    <span>{row.value}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between gap-4 border-b border-white/10 py-1 text-base">
                  <span>Hours</span>
                  <span>{restaurant?.operating_hours ?? "Please call for hours"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={cn("pb-24 text-center text-sm lg:pb-6")}>
          © Copyright 2026 {restaurant?.name ?? "Ng Wanam Food House"}. All Rights Reserved
        </div>
      </div>
    </footer>
  );
}
