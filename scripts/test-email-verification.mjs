import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(path,mocks={}) {
  const output=ts.transpileModule(fs.readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const loaded={exports:{}};
  new Function("module","exports","require",output)(loaded,loaded.exports,name=>{
    assert(Object.hasOwn(mocks,name),`Unexpected import ${name}`); return mocks[name];
  });
  return loaded.exports;
}
function setup(options={}) {
  const calls=[];
  const auth={
    signUp:async payload=>{calls.push(["signup",payload]);return options.signup??{data:{user:{id:"pending",email_confirmed_at:null},session:null},error:null};},
    signInWithPassword:async()=>options.signin??{data:{user:{id:"verified",email_confirmed_at:"2026-11-05"}},error:null},
    signOut:async()=>{calls.push(["signout"]);return {error:null};},
  };
  const client={auth,from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:"customer",is_active:true}})})})})};
  const actions=load("src/app/(auth)/actions.ts",{
    "next/navigation":{redirect:path=>{calls.push(["redirect",path]);throw Error(`redirect:${path}`);}},
    "@/lib/auth":{roleHome:()=>"/home"},"@/lib/supabase/server":{createClient:async()=>client},
    "@/lib/email-registration":{emailConfirmationRequired:async()=>options.required!==false,registrationCallbackUrl:()=>"https://ngwanam.store/auth/confirm?next=/home"},
  });
  return {actions,calls};
}
const form=()=>{const data=new FormData();for(const [key,value] of Object.entries({fullName:"Test Customer",email:"test@example.invalid",password:"example123",confirmPassword:"example123"}))data.set(key,value);return data;};
{
  const test=setup({required:false});assert((await test.actions.signUp({},form())).error);assert.equal(test.calls.length,0);
}
{
  const test=setup();const result=await test.actions.signUp({},form());
  assert(result.message.includes("pending"));assert.equal(test.calls.length,1);
  assert.equal(test.calls[0][1].options.emailRedirectTo,"https://ngwanam.store/auth/confirm?next=/home");
}
{
  const test=setup({signup:{data:{user:{email_confirmed_at:"unexpected"},session:{access_token:"not-logged"}},error:null}});
  assert((await test.actions.signUp({},form())).error);assert(test.calls.some(([name])=>name==="signout"));assert(!test.calls.some(([name])=>name==="redirect"));
}
{
  const test=setup({signup:{data:{user:null,session:null},error:{message:"SMTP private details"}}});
  const result=await test.actions.signUp({},form());assert(result.error && !result.error.includes("private"));
}
for(const signin of [{data:{user:null},error:{code:"email_not_confirmed"}},{data:{user:{id:"pending",email_confirmed_at:null}},error:null}]) {
  const test=setup({signin});assert((await test.actions.signIn({},form())).error.includes("erify"));assert(!test.calls.some(([name])=>name==="redirect"));
}
await assert.rejects(setup().actions.signIn({},form()),/redirect:\/home/);

const helper=load("src/lib/email-registration.ts");
const originalFetch=globalThis.fetch;
const oldEnv={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,site:process.env.AUTH_SITE_URL};
try {
  process.env.NEXT_PUBLIC_SUPABASE_URL="https://auth.example.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="public-test-key";
  process.env.AUTH_SITE_URL="https://ngwanam.store";
  for(const [value,expected] of [[false,true],[true,false],[undefined,false],["false",false]]) {
    globalThis.fetch=async(url,options)=>{assert(url.endsWith("/auth/v1/settings"));assert.equal(options.cache,"no-store");return{ok:true,json:async()=>({mailer_autoconfirm:value})};};
    assert.equal(await helper.emailConfirmationRequired(),expected);
  }
  globalThis.fetch=async()=>{throw Error("network");};assert.equal(await helper.emailConfirmationRequired(),false);
  assert.equal(helper.registrationCallbackUrl(),"https://ngwanam.store/auth/confirm?next=/home");
  process.env.AUTH_SITE_URL="https://ngwanam.store/other";assert.throws(()=>helper.registrationCallbackUrl());
} finally {
  globalThis.fetch=originalFetch;
  for(const [key,value] of Object.entries({NEXT_PUBLIC_SUPABASE_URL:oldEnv.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:oldEnv.key,AUTH_SITE_URL:oldEnv.site})) {
    if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
}
for(const origin of ["https://ngwanam.store","http://0.0.0.0:3000","https://evil.invalid"]) {
for(const [query,expected] of [["code=valid&next=/home","/home"],["token_hash=valid&type=signup&next=/home","/home"],["code=valid&next=//evil.invalid","/account"],["code=valid&next=%2F%5Cevil.invalid","/account"],["error=access_denied&error_code=otp_expired","/login?error=confirmation-failed"],["","/login?error=confirmation-failed"],["code=invalid","/login?error=confirmation-failed"],["code=unconfirmed","/login?error=confirmation-failed"],["code=valid&error_code=otp_expired","/login?error=confirmation-failed"]]) {
  let exchanges=0;
  let signouts=0;
  const exchange=async code=>{exchanges++;return {data:{user:{email_confirmed_at:code==="unconfirmed"?null:"verified"}},error:code==="invalid"?{code:"invalid_grant"}:null};};
  const route=load("src/app/auth/confirm/route.ts",{
    "next/server":{NextResponse:{redirect:url=>({location:url.href})}},
    "@/lib/email-registration":{registrationCallbackUrl:()=>"https://ngwanam.store/auth/confirm?next=/home"},
    "@/lib/supabase/server":{createClient:async()=>({auth:{exchangeCodeForSession:exchange,verifyOtp:async()=>exchange("valid"),signOut:async()=>{signouts++;}}})},
  });
  const result=await route.GET({url:`${origin}/auth/confirm?${query}`});assert.equal(result.location,`https://ngwanam.store${expected}`);
  if(query.includes("error_code=") || !query)assert.equal(exchanges,0);
  if(query==="code=unconfirmed")assert.equal(signouts,1);
}
}
assert(fs.readFileSync("src/lib/auth.ts","utf8").includes('if (!user.email_confirmed_at)'));
assert(fs.readFileSync("infrastructure/supabase/docker-compose.supabase.yml","utf8").includes("ENABLE_EMAIL_AUTOCONFIRM:-false"));
console.log("PASS email verification: effective-settings fail-closed signup, no pre-confirmation login/session redirect, SMTP failure feedback, confirmed login preserved, fixed callback URL, PKCE/token-hash confirmation and same-site redirects. Mocked services only; no real emails or hosted accounts created.");
