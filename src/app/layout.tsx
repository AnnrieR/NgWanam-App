import type { Metadata } from "next";
import { Geist, Lato } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Chatbot } from "@/components/chatbot";
import { themeStorageKey } from "@/lib/theme";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { TooltipProvider } from "@/components/ui/tooltip";

const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-sans" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const eggRoll = localFont({ src: "../fonts/eggroll.woff2", variable: "--font-display", weight: "400" });

export const metadata: Metadata = {
  title: "Ng Wanam",
  description: "Ng Wanam online ordering, delivery, and inventory system.",
};

/**
 * Applies the saved light/dark mode before the first paint so the shell never
 * flashes white while hydration is still pending. Mirrors `readTheme()` in
 * `@/components/theme-toggle`.
 */
const themeBootScript = `(function(){try{var k=${JSON.stringify(themeStorageKey)};var saved=window.localStorage.getItem(k);var dark=saved==="dark"||(saved!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={cn("font-sans", lato.variable, geist.variable, eggRoll.variable)} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <TooltipProvider>{children}
        <NavigationFeedback />
        <Chatbot />
        </TooltipProvider>
      </body>
    </html>
  );
}
