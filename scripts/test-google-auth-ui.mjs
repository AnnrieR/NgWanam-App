import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { cn } from "cn";

let pending = false;
let error;
let googleHookCalls = 0;
const startGoogle = () => {};
const signIn = () => {};
const signUp = () => {};
const hooks = { ...React, useActionState: action => {
  assert([startGoogle,signIn,signUp].includes(action));
  if (action === startGoogle) googleHookCalls++;
  return [action === startGoogle ? { error } : {}, "/test-server-action", action === startGoogle && pending];
} };
function load(path,mocks) {
  const output = ts.transpileModule(fs.readFileSync(path,"utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const loaded = { exports: {} };
  new Function("module","exports","require",output)(loaded,loaded.exports,name => {
    if (name === "react") return hooks;
    if (name === "react/jsx-runtime") return jsx;
    assert(Object.hasOwn(mocks,name),`Unexpected import ${name}`); return mocks[name];
  });
  return loaded.exports;
}
const icon = props => React.createElement("svg",props);
const button = ({ variant, size, ...props }) => { void variant; void size; return React.createElement("button",props); };
const image = ({ unoptimized, preload, ...props }) => { void unoptimized; void preload; return React.createElement("img",props); };
const input = props => React.createElement("input",props);
const google = load("src/components/google-auth-form.tsx", {
  "next/image": { default: image }, "lucide-react": { LoaderCircle: icon },
  "@/app/auth/google/actions": { startGoogle }, "@/components/ui/button": { Button: button }, "@/components/ui/form-input": { Input: input },
});
const renderGoogle = props => renderToStaticMarkup(React.createElement(google.GoogleAuthForm,props));
const normal = renderGoogle({});
assert.equal(googleHookCalls,1);
assert.match(normal,/<form[^>]*action="\/test-server-action"/);
assert.match(normal,/type="submit"/);
assert(normal.includes("Continue with Google"));
assert.match(normal,/<img[^>]*src="\/google-g.png"[^>]*width="20"[^>]*height="20"/);
assert(normal.includes("bg-white") && normal.includes("object-contain"));
for (const style of ["h-11","w-full","grid-cols-","border-[#747775]","dark:bg-[#131314]","dark:text-[#E3E3E3]","focus-visible:ring-2","motion-reduce:transition-none"]) assert(normal.includes(style),style);
assert(!normal.includes('name="link"'));
pending = true;
const waiting = renderGoogle({});
assert(waiting.includes('aria-busy="true"') && waiting.includes('disabled=""') && waiting.includes("Connecting…"));
assert(waiting.includes('src="/google-g.png"')); // Logo stays unmodified; only separate spinner animates.
pending = false;
error = "Google sign-in is unavailable.";
assert(renderGoogle({}).includes('role="alert"'));
error = undefined;
const linking = renderGoogle({ linking: true });
assert(linking.includes('name="link" value="yes"'));
assert.match(linking,/<input(?=[^>]*name="password")(?=[^>]*required="")[^>]*>/);
assert.match(linking,/<input(?=[^>]*name="consent")(?=[^>]*required="")[^>]*>/);
assert(linking.includes("Verify password and link Google"));

const wrapper = tag => function Wrapper(props) { return React.createElement(tag,props); };
const auth = load("src/app/(auth)/auth-form.tsx", {
  "@/components/ui/form": { Form: wrapper("form") }, "next/link": { default: wrapper("a") }, "next/image": { default: image },
  "lucide-react": { Check: icon, Eye: icon, EyeOff: icon, X: icon }, "@/components/ui/button": { Button: button },
  "@/components/ui/card": Object.fromEntries(["Card","CardContent","CardDescription","CardHeader","CardTitle"].map(name=>[name,wrapper("div")])),
  "@/components/ui/field": Object.fromEntries(["Field","FieldError","FieldGroup","FieldLabel"].map(name=>[name,wrapper("div")])),
  "@/components/ui/form-input": { Input: input }, "@/lib/utils": { cn }, "@/components/google-auth-form": google,
  "./actions": { signIn, signUp },
});
for (const mode of ["login","register"]) {
  const markup = renderToStaticMarkup(React.createElement(auth.AuthForm,{ mode, googleEnabled: true }));
  assert(markup.includes("OR CONTINUE WITH EMAIL"));
  assert(markup.indexOf("Continue with Google") < markup.indexOf("OR CONTINUE WITH EMAIL"));
  assert(markup.indexOf("OR CONTINUE WITH EMAIL") < markup.indexOf('id="email"'));
  assert.equal((markup.match(/<form\b/g) ?? []).length,2); // No nested OAuth/password forms.
  assert(markup.includes("Account security"));
}
const disabled = renderToStaticMarkup(React.createElement(auth.AuthForm,{ mode: "login", googleEnabled: false }));
assert(!disabled.includes("OR CONTINUE WITH EMAIL") && !disabled.includes("google-g.png"));
assert.equal(createHash("sha256").update(fs.readFileSync("public/google-g.png")).digest("hex"),"d1ce9c2af0b10a7333abc99bc706f9a6a199e5b65bf3e3009624f076b8638e6a");
assert(fs.statSync("public/google-sans-medium.ttf").size < 20000);
assert(fs.readFileSync("public/google-sans-OFL.txt","utf8").includes("SIL OPEN FONT LICENSE"));
console.log("PASS Google UI: existing OAuth action binding, official unmodified asset, full-width light/dark styles, pending/error states, password/consent linking, divider order, separate forms and feature-off behavior. SSR/mocked components only; not live OAuth or actual-browser verification.");
