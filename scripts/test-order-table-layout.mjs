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
import { cn } from "cn";

function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} };
  new Function("exports", "require", code)(loaded.exports, name => {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsx;
    assert(Object.hasOwn(mocks, name), `Unexpected dependency ${name}`);
    return mocks[name];
  });
  return loaded.exports;
}
const table = load("src/components/ui/table.tsx", { cn: { cn } });
const operations = load("src/lib/operations.ts");
const { OperationsOrders } = load("src/components/operations-orders.tsx", {
  "@/components/ui/table": table,
  "@/components/ui/label": { Label: props => React.createElement("label", props) },
  "@/components/ui/form-input": { Input: props => React.createElement("input", props) },
  "@/components/ui/button": { Button: ({ variant, size, render, ...props }) => { void variant; void size; void render; return React.createElement("button", props); } },
  "next/link": { default: props => React.createElement("a", props) },
  "@/lib/operations": operations,
});
const css = fs.readdirSync(".next/static/chunks", { recursive: true }).filter(file => file.endsWith(".css")).map(file => fs.readFileSync(path.join(".next/static/chunks", file), "utf8")).join("\n");
assert(css, "Build before running this test.");
const browser = process.env.SCROLL_TEST_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "opencode", "order-table-"));
for (const width of [390, 1024, 1440, 1920]) {
  const orders = ["1x Lumpia Shanghai, 1x Fried Chicken, 1x Miki Guisado - Pork Laman", "VeryLongUnbrokenMenuItemName".repeat(12)].map((items, index) => ({
    id: `fixture-${index}`, orderNumber: index + 1, customer: "Layout Test Customer", phone: "00000000000",
    createdAt: new Date().toISOString(), status: "preparing", orderType: "pickup", payment: "cod", items,
    extraActions: React.createElement("button", null, "Mark ready"),
  }));
  const markup = renderToStaticMarkup(React.createElement(OperationsOrders, { orders, defaultTab: "preparing" }));
  const file = path.join(temp, `${width}.html`);
  fs.writeFileSync(file, `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main style="padding:24px;min-width:0;${width >= 1024 ? "margin-left:260px" : ""}">${markup}</main><script>
    const rows = [...document.querySelectorAll('tbody tr')];
    const cells = rows.flatMap(row => [...row.cells].map(cell => {
      const box = cell.getBoundingClientRect();
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      let text; let contained = true;
      while (text = walker.nextNode()) {
        const range = document.createRange(); range.selectNodeContents(text);
        for (const rect of range.getClientRects()) if (rect.left < box.left - 1 || rect.right > box.right + 1) contained = false;
      }
      return { contained, overflow: cell.scrollWidth > cell.clientWidth + 1 };
    }));
    const result = { count: rows.length, cells, pageFits: document.scrollingElement.scrollWidth <= innerWidth + 1 };
    const output = document.createElement('pre'); output.id = 'results'; output.style.display = 'none'; output.textContent = JSON.stringify(result); document.body.append(output);
  </script></body></html>`);
  const result = spawnSync(browser, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${path.join(temp, `profile-${width}`)}`, `--window-size=${width},900`, "--dump-dom", pathToFileURL(file).href], { encoding: "utf8", timeout: 30000, maxBuffer: 12 * 1024 * 1024 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr.slice(-1000));
  const encoded = result.stdout.match(/<pre id="results"[^>]*>([^<]+)<\/pre>/)?.[1];
  assert(encoded, "Missing browser measurements");
  const measurements = JSON.parse(encoded.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
  assert.equal(measurements.count, 2);
  assert(measurements.pageFits, `Page overflow at ${width}`);
  assert(measurements.cells.every(cell => cell.contained && !cell.overflow), `Overlapping cell content at ${width}: ${JSON.stringify(measurements)}`);
}
console.log("PASS order table browser geometry at 390/1024/1440/1920: long item lists and unbroken names remain inside cells; table overflow stays local. Actual SSR component/built CSS, mocked data, not hosted verification.");
