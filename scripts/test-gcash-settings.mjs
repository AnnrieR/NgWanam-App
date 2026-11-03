import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const compiled = ts.transpileModule(fs.readFileSync("src/lib/gcash-settings.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const result = { exports: {} };
new Function("module", "exports", compiled)(result, result.exports);
const { normalizeGcashNumber, gcashIsAvailable, managedGcashQrPath } = result.exports;
for (const input of ["09123456789", "+63 912-345-6789", "639123456789", "(0912) 345-6789"]) assert.equal(normalizeGcashNumber(input), "09123456789");
assert(!gcashIsAvailable({ enabled: false, accountName: "Recipient", accountNumber: "09123456789" }));
assert(!gcashIsAvailable({ enabled: true, accountName: "", accountNumber: "09123456789" }));
assert(!gcashIsAvailable({ enabled: true, accountName: "Recipient", accountNumber: "123" }));
assert(gcashIsAvailable({ enabled: true, accountName: "Recipient", accountNumber: "09123456789" }));
assert(!managedGcashQrPath("https://untrusted.invalid/qr.png"));
assert(!managedGcashQrPath("../../qr.png"));
assert(managedGcashQrPath("10000000-0000-0000-0000-000000000001/11111111-1111-4111-8111-111111111111.png"));
const checkout = fs.readFileSync("src/app/(protected)/checkout/checkout-form.tsx", "utf8");
assert(!checkout.includes("storePhones") && !checkout.includes("gcashPhones"));
assert(checkout.includes("gcashAccountName") && checkout.includes("gcashAccountNumber"));
assert(checkout.includes("Sender GCash Number"));
const action = fs.readFileSync("src/app/(protected)/admin/settings/actions.ts", "utf8");
assert(action.includes('requireRole(["admin"])') && action.includes("validateImage(file)"));
console.log("PASS dedicated GCash recipient gates, Philippine number normalization, managed QR paths, no contact-number fallback, sender labels and admin upload guards. No database or provider requests.");
