import Image from "next/image";
import Link from "@/components/navigation-link";

export function DashboardBrand({ href }: { href: string }) {
  return <Link href={href} aria-label="Ng Wanam Food House dashboard" className="mb-6 mt-2 flex shrink-0 items-center gap-2 px-3 py-2">
    <Image alt="" src="/menu-images/ng wanam logo.png" width={44} height={44} className="size-11 shrink-0 object-contain" />
    <span className="text-sm font-black leading-tight text-[#bd2507] dark:text-[#ffb35c]">NG-WANAM<br /><span className="text-xs tracking-wide">FOOD HOUSE</span></span>
  </Link>;
}
