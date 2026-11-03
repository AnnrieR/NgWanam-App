// Pure date aggregation and server-render checks. No DB or order fixtures.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, imports = {}) {
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "module", "exports", code)(name => name in imports ? imports[name] : require(name), compiled, compiled.exports);
  return compiled.exports;
}
const operations = load("src/lib/operations.ts");
const { dailyOrderCounts } = load("src/lib/report-order-trend.ts", { "@/lib/operations": operations });
const start = "2026-10-22T16:00:00.000Z"; // Oct 23 midnight, Philippines.
const empty = dailyOrderCounts([], start);
assert.equal(empty.length, 7);
assert.equal(empty[0].date, "2026-10-23");
assert.equal(empty.at(-1).date, "2026-10-29");
assert(empty.every(day => day.count === 0));
const days = dailyOrderCounts([
  { created_at: "2026-10-22T15:59:59.999Z" }, // Before reporting window.
  { created_at: start, status: "cancelled" }, // Cancelled still counts.
  { created_at: "2026-10-23T15:59:59.999Z" }, // Same Philippine date.
  { created_at: "2026-10-23T16:00:00.000Z" }, // Next Philippine date.
  { created_at: "2026-10-29T15:59:59.999Z" },
  { created_at: "2026-10-29T16:00:00.000Z" }, // Outside today.
], start);
assert.deepEqual(days.map(day => day.count), [2, 1, 0, 0, 0, 0, 1]);
const card = ({ children, ...props }) => React.createElement("div", props, children);
const { OrderVolumeTrend, OrderStatusChart, BestSellersChart } = load("src/components/report-charts.tsx", {
  "@/components/ui/card": { Card: card, CardContent: card, CardHeader: card, CardTitle: card },
});
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
let html = render(OrderVolumeTrend, { days: empty });
assert(html.includes("No orders were placed in this period."));
assert(!/NaN|Infinity|₱/.test(html));
assert(!html.includes('data-report-chart="sales"'));
html = render(OrderVolumeTrend, { days });
assert.equal((html.match(/data-order-date=/g) ?? []).length, 7);
assert(html.includes("height:100%"));
assert(html.includes("height:50%"));
assert(html.includes('data-order-count="2"'));
assert(html.includes("orders in 7 days"));
assert(!/NaN|Infinity|₱/.test(html));
assert(render(OrderStatusChart, { statuses: [], date: "2026-10-29" }).includes("No orders were placed on this date."));
assert.equal((render(OrderStatusChart, { statuses: ["pending", "completed", "cancelled"], date: "2026-10-29" }).match(/data-count="1"/g) ?? []).length, 3);
assert(render(BestSellersChart, { items: [["Escaped & <item>", 2]] }).includes("Escaped &amp; &lt;item&gt;"));
console.log("PASS seven-day placement counts, Philippine midnight/window boundaries, cancelled inclusion, zero/nonzero charts, proportional bars, no sales/currency graph, status and escaped labels. No database writes.");
