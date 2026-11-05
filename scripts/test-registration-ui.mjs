import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { cn } from "cn";

// State/action harness for the actual AuthForm, not a copy of its reset logic.
const values=[];
let cursor=0;
let submit;
let result={};
let serverCalls=0;
const input=()=>null;
const dialog=()=>null;
const description=()=>null;
const noop=()=>null;
const loaded={exports:{}};
const output=ts.transpileModule(fs.readFileSync("src/app/(auth)/auth-form.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const mocks={
  "react/jsx-runtime":jsx,
  "react":{
    useState:initial=>{const index=cursor++;if(!(index in values))values[index]=initial;return[values[index],next=>{values[index]=typeof next==="function"?next(values[index]):next;}];},
    useActionState:action=>{submit=action;return[{},"/mock-action",false];},
  },
  "@/components/ui/form":{Form:noop},"next/link":{default:noop},"next/image":{default:noop},
  "lucide-react":Object.fromEntries(["Check","Eye","EyeOff","MailCheck","X"].map(name=>[name,noop])),
  "@/components/ui/button":{Button:noop},"@/components/ui/form-input":{Input:input},"@/lib/utils":{cn},
  "@/components/google-auth-form":{GoogleAuthForm:noop},
  "@/components/ui/card":Object.fromEntries(["Card","CardContent","CardDescription","CardHeader","CardTitle"].map(name=>[name,noop])),
  "@/components/ui/field":Object.fromEntries(["Field","FieldError","FieldGroup","FieldLabel"].map(name=>[name,noop])),
  "@/components/ui/alert-dialog":{AlertDialog:dialog,AlertDialogContent:noop,AlertDialogDescription:description,AlertDialogTitle:noop},
  "./actions":{signUp:async()=>{serverCalls++;return result;},signIn:async()=>result},
};
new Function("module","exports","require",output)(loaded,loaded.exports,name=>{assert(Object.hasOwn(mocks,name),name);return mocks[name];});
function render(mode="register"){cursor=0;return loaded.exports.AuthForm({mode,googleEnabled:true});}
function nodes(tree){if(!tree||typeof tree!=="object")return[];return[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];}
function field(tree,name){return nodes(tree).find(node=>node.props?.name===name);}
function fill(tree){for(const [name,value] of Object.entries({fullName:"Test Customer",email:"test@example.invalid",password:"example123",confirmPassword:"example123"}))field(tree,name).props.onChange({target:{value}});}
let tree=render();fill(tree);tree=render();
for(const name of ["fullName","email","password","confirmPassword"])assert(field(tree,name).props.value);
const oldKey=field(tree,"password").key;
result={error:"Please correct this field."};
await submit({},new FormData());tree=render();
for(const name of ["fullName","email","password","confirmPassword"])assert(field(tree,name).props.value,"Errors must preserve typed input");
assert.equal(nodes(tree).find(node=>node.type===dialog).props.open,false);
const message="Check your inbox and spam folder for the verification link. Your account stays pending until you verify your email. If the email is already registered, sign in or reset your password instead.";
result={message};
await submit({},new FormData());tree=render();
for(const name of ["fullName","email","password","confirmPassword"])assert.equal(field(tree,name).props.value,"");
assert.notEqual(field(tree,"password").key,oldKey,"Password visibility widget must remount");
assert.equal(nodes(tree).find(node=>node.type===dialog).props.open,true);
assert.equal(nodes(tree).find(node=>node.type===description).props.children,message);
nodes(tree).find(node=>node.type===dialog).props.onOpenChange(false);
tree=render();assert.equal(nodes(tree).find(node=>node.type===dialog).props.open,false);
fill(tree);render();await submit({},new FormData());tree=render();
assert.equal(nodes(tree).find(node=>node.type===dialog).props.open,true,"Repeated successful submission should reopen the notice");
assert.equal(serverCalls,3);
console.log("PASS registration UI: actual action wrapper preserves errors, clears full name/email/password/confirmation on success, resets password visibility keys, opens exact verification message and supports close/reopen. State harness only; not a browser/password-manager test.");
