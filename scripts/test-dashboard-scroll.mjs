import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";
import { cn } from "cn";

// Uses an installed browser, built application CSS, and the actual SSR dashboard
// components with mocked auth/cart/widgets. No database, accounts or dev route.
const browser = process.env.SCROLL_TEST_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
assert(fs.existsSync(browser), "Set SCROLL_TEST_BROWSER to an installed Chromium/Edge executable.");
function load(file, mocks) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, name => {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsx;
    assert(Object.hasOwn(mocks, name), `Unexpected dependency ${name}`); return mocks[name];
  });
  return loaded.exports;
}
const empty = () => null;
const link = ({ children, ...props }) => React.createElement("a", props, children);
const button = ({ variant, size, ...props }) => { void variant; void size; return React.createElement("button", props); };
const common = {
  "@/components/ui/button": { Button: button }, "@/components/navigation-link": { default: link },
  "lucide-react": icons, "next/navigation": { usePathname: () => "/checkout" }, "@/lib/utils": { cn },
  "@/components/logout-dialog": { LogoutDialog: empty }, "@/components/theme-toggle": { ThemeToggle: empty },
  "@/components/dashboard-brand": { DashboardBrand: () => React.createElement("div", { className: "mb-6 shrink-0" }, "Ng Wanam") },
  "@/components/notification-bell": { NotificationBell: empty },
};
const role = load("src/components/role-dashboard.tsx", { ...common, "@/lib/supabase/client": { createClient: () => { throw Error("No live access"); } } });
const customer = load("src/components/customer-dashboard.tsx", {
  ...common, "@/components/role-dashboard": role,
  "@/components/ui/form": { Form: props => React.createElement("form", props) },
  "@/components/ui/form-input": { Input: props => React.createElement("input", props) },
  "@/hooks/use-cart": { useCart: () => ({ cart: [] }) },
});
const cssFiles = fs.readdirSync(".next/static/chunks", { recursive: true }).filter(file => file.endsWith(".css"));
assert(cssFiles.length, "Run npm run build before the browser scroll test.");
const css = cssFiles.map(file => fs.readFileSync(path.join(".next/static/chunks", file), "utf8")).join("\n");
const tempBase = path.join(os.tmpdir(), "opencode");
fs.mkdirSync(tempBase, { recursive: true });
const temp = fs.mkdtempSync(path.join(tempBase, "dashboard-scroll-"));
const cases = [
  [390, 844, "customer", "light"], [1024, 768, "customer", "light"],
  [1279, 800, "customer", "dark"], [1304, 800, "customer", "light"],
  [1440, 900, "customer", "dark"], [1920, 1080, "customer", "light"],
  [1440, 600, "admin", "dark"], [390, 844, "admin", "light"],
];
for (const [width, height, accountRole, theme] of cases) {
  const Component = accountRole === "customer" ? customer.CustomerDashboard : role.RoleDashboard;
  const children = React.createElement("div", null, React.createElement("h1", null, "Long checkout fixture"), React.createElement("div", { style: { height: 1800 } }, "Delivery, discount request, payment details"), React.createElement("button", { id: "checkout-end" }, "Place Order"));
  const markup = renderToStaticMarkup(React.createElement(Component, { fullName: "Layout Test", role: accountRole }, children));
  const file = path.join(temp, `fixture-${width}-${accountRole}-${theme}.html`);
  fs.writeFileSync(file, `<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${markup}<script>
    const main = document.querySelector('main');
    main.scrollTop = 1e6;
    window.scrollTo({ top: 1e6, behavior: 'instant' });
    const end = document.querySelector('#checkout-end').getBoundingClientRect();
    const rect = main.getBoundingClientRect();
    const report = { width: innerWidth, height: innerHeight, pageHeight: document.scrollingElement.scrollHeight, pageWidth: document.scrollingElement.scrollWidth, pageScrollTop: scrollY, mainHeight: main.clientHeight, mainScrollHeight: main.scrollHeight, mainScrollTop: main.scrollTop, overflow: getComputedStyle(main).overflowY, endReachable: end.bottom <= Math.min(rect.bottom, innerHeight) + 1 && end.top >= 0, headerTop: document.querySelector('header').getBoundingClientRect().top };
    const output = document.createElement('pre'); output.id='scroll-results'; output.style.cssText='position:fixed;display:none'; output.textContent=JSON.stringify(report); document.body.append(output);
  </script></body></html>`);
  const result = spawnSync(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions", `--user-data-dir=${path.join(temp, `profile-${width}-${accountRole}-${theme}`)}`, `--window-size=${width},${height}`, "--dump-dom", pathToFileURL(file).href], { encoding: "utf8", timeout: 25000, maxBuffer: 12 * 1024 * 1024 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr.slice(-1000));
  const encoded = result.stdout.match(/<pre id="scroll-results"[^>]*>([^<]+)<\/pre>/)?.[1];
  assert(encoded, "Browser did not return layout measurements.");
  const measurement = JSON.parse(encoded.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
  assert(measurement.pageWidth <= measurement.width + 1, `Horizontal overflow: ${JSON.stringify(measurement)}`);
  if (accountRole === "customer") {
    assert(measurement.pageHeight > measurement.height && measurement.pageScrollTop > 0, "Customer checkout must use document scrolling at every size");
    assert.equal(measurement.overflow, "visible", "Customer main content must not create an inner scrollbar");
    assert.equal(measurement.mainScrollTop, 0);
    assert(measurement.endReachable, "Checkout bottom must remain reachable via normal page scroll");
    assert(measurement.headerTop >= 0, "Customer header must stay visible while the page scrolls");
  } else if (measurement.width >= 1280) {
    assert(measurement.pageHeight <= measurement.height + 1, `Outer page must not scroll on desktop: ${JSON.stringify(measurement)}`);
    assert.equal(measurement.overflow, "auto");
    assert(measurement.mainScrollTop > 0 && measurement.endReachable, `Checkout bottom must be reachable: ${JSON.stringify(measurement)}`);
    assert(measurement.headerTop >= 0, "Header must remain visible");
  } else {
    assert(measurement.pageHeight > measurement.height, "Mobile/tablet must retain normal document scrolling");
    assert.equal(measurement.overflow, "visible", "No nested content scroller below fixed-height breakpoint");
  }
  console.log(`PASS ${accountRole} ${theme} ${measurement.width}×${measurement.height}: page=${measurement.pageHeight}, main=${measurement.mainHeight}/${measurement.mainScrollHeight}, overflow=${measurement.overflow}`);
}
console.log("PASS real headless-browser geometry with built CSS and mocked SSR dashboards. Not live checkout/auth, interactive drawer/dialog or actual-phone verification.");
