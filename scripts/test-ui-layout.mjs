import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";
import { cn } from "cn";

function load(path, mocks) {
  const compiled = ts.transpileModule(fs.readFileSync(path,"utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const loaded = { exports: {} };
  new Function("module","exports","require",compiled)(loaded,loaded.exports,name => {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsx;
    assert(Object.hasOwn(mocks,name),`Unexpected dependency: ${name}`);
    return mocks[name];
  });
  return loaded.exports;
}
const icon = props => React.createElement("svg",props);
const button = ({ variant, ...props }) => { void variant; return React.createElement("button",props); };
const file = load("src/components/ui/form-input.tsx", {
  "lucide-react": { Upload: icon }, "@/components/ui/input": { Input: () => null },
  "@/components/ui/checkbox": { Checkbox: () => null }, "@/components/ui/button": { Button: button },
  "@/components/ui/date-picker": { DatePicker: () => null }, "@/lib/utils": { cn },
  "@/lib/image-upload": { validImageSize: size => size < 1048576, IMAGE_UPLOAD_HINT: "Smaller than 1 MB." },
  "@/components/ui/alert-dialog": { AlertDialog: () => null, AlertDialogContent: () => null, AlertDialogDescription: () => null, AlertDialogTitle: () => null },
});
const markup = renderToStaticMarkup(React.createElement(file.Input,{
  type:"file", name:"avatar", accept:"image/png,image/jpeg,image/webp,image/gif,image/avif",
  className:"w-full rounded-3xl bg-input/50 text-sm",
}));
assert.match(markup,/<input[^>]*type="file"[^>]*class="sr-only"/);
assert.match(markup,/<button[^>]*class="[^"]*justify-start[^"]*"/);
assert.match(markup,/<svg[^>]*class="size-4 shrink-0"/);
assert.match(markup,/<span class="min-w-0 flex-1 truncate">Choose image<\/span>/);
const profile = fs.readFileSync("src/app/(protected)/account/page.tsx","utf8");
const avatar = profile.split("\n").find(line=>line.includes('name="avatar"'));
assert(avatar && !/\bblock\b|file:/.test(avatar),"Native-input block/file styles must not override the flex chooser button");
assert.match(fs.readFileSync("src/components/ui/button.tsx","utf8"),/inline-flex.*items-center/);

const nav = load("src/components/site-nav.tsx", {
  "@/components/ui/button": { Button: button },
  "next/link": { default: ({ children, ...props }) => React.createElement("a",props,children) },
  "next/image": { default: ({ priority, ...props }) => { void priority; return React.createElement("img",props); } },
  "next/navigation": { usePathname: () => "/" },
  "lucide-react": { Menu: icon, Phone: icon, ShoppingCart: icon, X: icon },
  "@/components/landing/common": { wideContainerClass: "container" },
  "@/components/theme-toggle": { ThemeToggle: ({ className }) => React.createElement("button",{ className },"Theme") },
  "@/lib/utils": { cn },
});
const navMarkup = renderToStaticMarkup(React.createElement(nav.SiteNav,{ restaurant: null }));
assert.match(navMarkup,/<aside[^>]*class="[^"]*bg-\[#400D0A\][^"]*text-white[^"]*"/);
for (const label of ["Open menu","Close menu"]) {
  const tag = navMarkup.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0];
  assert(tag?.includes("text-white") && tag.includes("hover:text-white"),`${label} must stay visible on the brown surface`);
}
function luminance(hex) {
  const channels = hex.match(/\w\w/g).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
assert((luminance("ffffff")+0.05)/(luminance("400d0a")+0.05)>4.5);
console.log("PASS UI regression: rendered upload icon/text alignment classes, filename truncation, profile button styles, fixed-brown drawer foreground, open/close button colors and white/brown contrast. SSR/mocked UI only; not an actual browser or phone layout test.");

const footer = load("src/components/site-footer.tsx", {
  "next/link": { default: ({ children, ...props }) => React.createElement("a",props,children) },
  "lucide-react": { MapPin: icon, Phone: icon },
  "@/lib/hours": { getWeeklyHours: hours => hours ? [{ day: "Monday", value: hours }] : null },
  "@/components/landing/common": { containerClass: "container" },
  "@/lib/utils": { cn },
});
for (const restaurant of [null, { name: "Ng Wanam", address: "Batangas City", phone_numbers: ["(043) 723 2560"], facebook_url: "https://facebook.com/example", operating_hours: "6:30 AM - 7:30 PM" }]) {
  const footerMarkup = renderToStaticMarkup(await footer.SiteFooter({ restaurant }));
  assert(footerMarkup.includes("Navigation"));
  for (const section of ["home", "gallery", "ourstory", "menu"]) assert(footerMarkup.includes(`href="/#${section}"`));
  assert(!footerMarkup.includes("Reviews") && !footerMarkup.includes("/#reviews"));
  assert(!footerMarkup.includes("Coupons") && !footerMarkup.includes("/#coupons"));
  for (const text of ["NG WANAM", "Find Us", "Open Hours", "All Rights Reserved"]) assert(footerMarkup.includes(text));
  assert(footerMarkup.includes("grid-cols-2") && footerMarkup.includes("lg:grid-cols-[auto_12%_25%_1fr]"));
  if (restaurant) {
    assert(footerMarkup.includes('href="tel:0437232560"'));
    assert(footerMarkup.includes("Batangas City") && footerMarkup.includes("Monday") && footerMarkup.includes('aria-label="Facebook"'));
  } else assert(footerMarkup.includes("Contact us for details.") && footerMarkup.includes("Please call for hours"));
}
const landing = fs.readFileSync("src/app/page.tsx","utf8");
assert(landing.includes("<Coupons") && landing.includes("landing/coupons"));
assert(landing.includes("<SiteHeader") && landing.includes("<SiteFooter"));
console.log("PASS footer/landing: navigation restored with Home/Gallery/Our Story/Menu only; Reviews/Coupons links absent; offers cards restored; branding, contact links, hours/fallbacks, copyright and main header preserved. SSR/mocked UI only.");
