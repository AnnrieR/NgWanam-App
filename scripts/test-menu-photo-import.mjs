import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as crypto from "node:crypto";

function load(path, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("module","exports","require",compiled)(loaded,loaded.exports,name => {
    assert(Object.hasOwn(mocks,name),`Unexpected import ${name}`); return mocks[name];
  });
  return loaded.exports;
}
const photo = load("src/lib/approved-menu-photo.ts");
const service = load("src/lib/menu-photo-import.ts", { "node:crypto": crypto, "./approved-menu-photo": photo });
const allKeys = photo.approvedPhotoMenu.map(item=>item.key);
const groups = Object.fromEntries(Object.keys(photo.menuGroups).map(key => [key,`category-${key}`]));
function database(seed = {}) {
  const tables = { menu_items: [], menu_variants: [], inventory: [], categories: Object.entries(groups).map(([key,id])=>({id,name:key})), ...structuredClone(seed) };
  const control = { writes: [], failInventoryAt: 0, inventoryAttempts: 0, readError: false };
  const client = { from(table) {
    let operation = "select", payload, options, columns, range, order;
    const filters = [];
    const query = {
      select: value => { columns = value; return query; },
      order: value => { order = value; return query; },
      range: (a,b) => { range=[a,b]; return query; },
      eq: (key,value) => { filters.push(row=>row[key]===value); return query; },
      in: (key,values) => { filters.push(row=>values.includes(row[key])); return query; },
      upsert: (value,opts) => { operation="upsert"; payload=value; options=opts; return query; },
      update: value => { operation="update"; payload=value; return query; },
      single: async () => { const result=execute(); return result.error ? result : result.data.length===1 ? { data:result.data[0],error:null } : { data:null,error:{code:"PGRST116"} }; },
      maybeSingle: async () => { const result=execute(); return result.error ? result : { data:result.data[0]??null,error:null }; },
      then: (resolve,reject) => Promise.resolve().then(execute).then(resolve,reject),
    };
    function execute() {
      if (control.readError && operation === "select") return {data:null,error:{code:"NETWORK"}};
      let rows = tables[table].filter(row=>filters.every(filter=>filter(row)));
      if (operation === "upsert") {
        if (table === "inventory" && ++control.inventoryAttempts === control.failInventoryAt) return {data:null,error:{code:"TEST_FAILURE"}};
        assert.equal(options.ignoreDuplicates,true);
        const exists=tables[table].find(row=>row[options.onConflict]===payload[options.onConflict]);
        if (!exists) { const row=structuredClone(payload); tables[table].push(row); control.writes.push({ table,operation,payload:row }); rows=[row]; }
        else rows=[];
      } else if (operation === "update") {
        for (const row of rows) Object.assign(row,payload);
        control.writes.push({ table,operation,payload,ids:rows.map(row=>row.id) });
      }
      if (order) rows=[...rows].sort((a,b)=>String(a[order]).localeCompare(String(b[order])));
      if (range) rows=rows.slice(range[0],range[1]+1);
      if (columns?.includes("menu_variants(")) rows=rows.map(row=>({ ...row,
        menu_variants: tables.menu_variants.filter(variant=>variant.menu_item_id===row.id).map(variant=>({ ...variant,
          inventory: tables.inventory.filter(stock=>stock.menu_variant_id===variant.id).map(stock=>({id:stock.id})),
        })),
      }));
      else if (columns) rows=rows.map(row=>Object.fromEntries(columns.split(',').map(key=>[key,row[key]])));
      return { data:structuredClone(rows),error:null };
    }
    return query;
  } };
  return { client,tables,control };
}
const fingerprint = async db => service.importFingerprint(await service.readImportItems(db.client));
const itemCount = photo.approvedPhotoMenu.length;
const servingCount = photo.approvedPhotoMenu.flatMap(row=>row.servings).length;
assert.equal(itemCount,121);
assert.equal(servingCount,171);
assert.equal(photo.approvedPhotoMenu.find(row=>row.key==="lumpia").servings[0].price,180);
assert.equal(photo.approvedPhotoMenu.find(row=>row.key==="lumpia").servings.length,1);
assert.equal(photo.approvedPhotoMenu.find(row=>row.key==="lechon-miki").servings.length,1);
assert.equal(photo.normalizeMenuName("Canton - Bihon"),photo.normalizeMenuName("Canton-Bihon"));
assert.equal(photo.normalizeMenuName("Sweet & Sour Chicken"),photo.normalizeMenuName("Sweet and Sour Chicken"));
assert(!photo.approvedPhotoMenu.some(row=>/siomai|corkage/i.test(row.name)));
const ids=allKeys.map(service.photoImportId); assert.equal(new Set(ids).size,itemCount);
assert(ids.every(id=>/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/.test(id)));
// Photo transcription checkpoints, independent of the catalog's generated counts.
const catalog = key => photo.approvedPhotoMenu.find(row=>row.key===key);
assert.deepEqual(catalog("miki").servings.map(row=>row.price),[110,170,550,700]);
assert.deepEqual(catalog("miki-chicken").servings.map(row=>row.price),[140,200,600,750]);
assert.deepEqual(catalog("canton-chicken").servings.map(row=>row.price),[650,850]);
assert.deepEqual(catalog("pork-lumpia").servings,[{name:"20 pieces",label:"Good for 4 (20 pieces)",price:170}]);
assert.deepEqual(catalog("pork-chopsuey").servings.map(row=>row.price),[200,800,1700]);
assert.deepEqual(catalog("beef-chopsuey").servings.map(row=>row.price),[220,900,2200]);
assert.deepEqual(catalog("fried-rice").servings.map(row=>row.name),["Good for 1","Good for 4","Good for 8","Good for 12"]);
assert.deepEqual(catalog("fried-rice").servings.map(row=>row.price),[120,250,800,1100]);
assert.equal(catalog("seafood-rice").servings[0].price,300);
assert.equal(catalog("toyo-1l").servings[0].price,95);
assert.deepEqual(catalog("lumpia-sauce").servings.map(row=>row.price),[20,150]);
assert.deepEqual(catalog("lumpia-bilao").servings.map(row=>row.price),[950,1850]);
assert.deepEqual(catalog("chicken-bilao").servings.map(row=>row.price),[1500,3000]);
assert.equal(new Set(photo.approvedPhotoMenu.map(row=>photo.normalizeMenuName(row.name))).size,itemCount);
assert(service.sameServing({name:"Good for 8",label:"Good for 8",price:550},{name:"Family",serving_label:"Good for 8"}));
assert(!service.sameServing({name:"Good for 12",label:"Good for 12",price:700},{name:"Good for 8",serving_label:"Good for 8"}));
assert(service.sameServing({name:"20 pcs",label:"Good for 4 (20 pieces)",price:170},{name:"20 pieces",serving_label:"Good for 4"}));
assert(!service.sameServing({name:"20 pcs",label:"Good for 4 (20 pieces)",price:170},{name:"100 pieces",serving_label:"Good for 25 (100 pieces)"}));
// Batch 2: precise ranges/weights and generic labels must not invent guest counts.
assert.deepEqual(catalog("spaghetti").servings.map(row=>row.price),[170,1100]);
assert.deepEqual(catalog("carbonara").servings.map(row=>row.price),[215,1300]);
assert.deepEqual(catalog("lumpia-gulay").servings.map(row=>row.price),[150,360,540,1200]);
for (const [key,label,price] of [["birthday-meal","Set",1500],["party-box","Box",2000],["breaded-pork","Party Tray",1700]]) {
  assert.deepEqual(catalog(key).servings,[{name:label,label,price}]);
  assert(!catalog(key).servings.some(row=>/good for/i.test(row.label)));
}
const partyRows=photo.approvedPhotoMenu.filter(row=>row.group==="party");
assert.equal(partyRows.length,21);
assert(partyRows.every(row=>row.requiresPreorder===true));
assert.equal(catalog("chicken-kaldereta").servings[0].price,1900);
assert.equal(catalog("beef-broccoli").servings[0].price,2000);
assert.equal(catalog("seafood-sweet-chili").servings[0].price,2300);
assert.equal(catalog("pork-kaldereta").servings[0].label,"3 kilos");
assert.equal(catalog("buttered-shrimp").servings[0].label,"Per kilo");
assert(service.sameServing({name:"Per kilo",label:"Per kilo",price:1800},{name:"1 kg",serving_label:"1 kilogram"}));
assert(!service.sameServing({name:"3 kilos",label:"3 kilos",price:3000},{name:"1 kg",serving_label:"1 kilogram"}));
assert(service.sameServing({name:"Good for 12–15",label:"Good for 12–15",price:1700},{name:"Party tray",serving_label:"Good for 12-15"}));
assert(!service.sameServing({name:"Good for 12–15",label:"Good for 12–15",price:1700},{name:"Party tray",serving_label:"Good for 12"}));
{
  // Upgrade from an already imported batch 1: append only, keep every old ID/price/balance.
  const oldSizes={spaghetti:1,carbonara:1,"pork-chopsuey":2,"beef-chopsuey":2,"chicken-chopsuey":2,
    "fried-rice":2,"chicken-rice":1,"seafood-rice":1,"lumpia-gulay":3};
  const seed={menu_items:[],menu_variants:[],inventory:[]};
  for (const source of photo.approvedPhotoMenu.slice(0,95)) {
    const itemId=service.photoImportId(source.key);
    seed.menu_items.push({id:itemId,name:source.name,category_id:groups[source.group],description:"Existing saved description",is_active:true,approval_status:"approved",requires_preorder:false});
    for (const [index,row] of source.servings.slice(0,oldSizes[source.key]??source.servings.length).entries()) {
      const id=service.photoImportId(`${source.key}:serving:${index}`);
      seed.menu_variants.push({id,menu_item_id:itemId,name:row.name,serving_label:row.label,price:row.price+1,is_active:true});
      seed.inventory.push({id:service.photoImportId(`${source.key}:stock:${index}`),menu_variant_id:id,current_stock:9,reserved_stock:2,minimum_stock:1});
    }
  }
  assert.equal(seed.menu_variants.length,135);
  const db=database(seed);
  await service.importApprovedPhoto(db.client,groups,await fingerprint(db),allKeys);
  assert.deepEqual(db.tables.menu_items.slice(0,95),seed.menu_items);
  assert.deepEqual(db.tables.menu_variants.slice(0,135),seed.menu_variants);
  assert.deepEqual(db.tables.inventory.slice(0,135),seed.inventory);
  assert.equal(db.tables.menu_items.length,121);
  assert.equal(db.tables.menu_variants.length,171);
  assert.equal(db.tables.inventory.length,171);
  assert(db.tables.inventory.slice(135).every(row=>row.current_stock===15 && row.reserved_stock===0));
  for (const source of partyRows) {
    const saved=db.tables.menu_items.find(row=>row.id===service.photoImportId(source.key));
    assert(saved.is_active && saved.requires_preorder && saved.approval_status==="approved");
  }
  for (const key of ["birthday-meal","party-box","breaded-pork"]) {
    const saved=db.tables.menu_items.find(row=>row.id===service.photoImportId(key));
    assert(saved.is_active); assert(saved.description.includes("Number of people not specified"));
    assert.equal(db.tables.menu_variants.find(row=>row.menu_item_id===saved.id).serving_label,catalog(key).servings[0].label);
  }
  assert(db.tables.menu_items.find(row=>row.id===service.photoImportId("party-box")).description.includes("Chicken Tenders"));
}
{
  const db=database({menu_items:[{id:"not-preorder",name:"Chicken Afritada",category_id:groups.party,description:null,is_active:true,approval_status:"approved",requires_preorder:false}]});
  const row=service.planPhotoImport(await service.readImportItems(db.client)).find(row=>row.source.key==="chicken-afritada");
  assert.equal(row.status,"review");
  await service.importApprovedPhoto(db.client,{},await fingerprint(db),["chicken-afritada"]);
  assert.equal(db.control.writes.length,0);
}
{
  // Main requested case: same menu/lahok, Good for 8 exists, only Good for 12 missing.
  const original={id:"existing-pork",name:"Miki Guisado",category_id:groups.pancit,description:"Keep this",is_active:true,approval_status:"approved"};
  const variants=[1,3,8].map((size,index)=>({id:`existing-size-${size}`,menu_item_id:original.id,name:`Good for ${size}`,serving_label:`Good for ${size}`,price:[110,170,599][index],is_active:size!==3}));
  const inventory=variants.map(variant=>({id:`stock-${variant.id}`,menu_variant_id:variant.id,current_stock:7,reserved_stock:2,minimum_stock:3}));
  const db=database({menu_items:[original],menu_variants:variants,inventory});
  const before=structuredClone(db.tables);
  const response=await service.importApprovedPhoto(db.client,{},await fingerprint(db),["miki"]);
  assert.equal(response[0].status,"created");
  assert.deepEqual(db.tables.menu_items,before.menu_items); // No item details/approval/active state edits.
  assert.deepEqual(db.tables.menu_variants.slice(0,3),before.menu_variants);
  assert.deepEqual(db.tables.inventory.slice(0,3),before.inventory);
  assert.equal(db.tables.menu_variants.length,4);
  assert.equal(db.tables.menu_variants[3].menu_item_id,original.id);
  assert.equal(db.tables.menu_variants[3].name,"Good for 12");
  assert.equal(db.tables.menu_variants[3].price,700);
  assert.equal(db.tables.inventory[3].current_stock,15);
  const fp=await fingerprint(db);
  db.tables.inventory[0].current_stock=6;
  assert.equal(await fingerprint(db),fp); // Orders don't invalidate a preview or reset stock.
  db.tables.menu_variants[0].price=999;
  await assert.rejects(service.importApprovedPhoto(db.client,{},fp,["miki"]),/Menu changed/);
}
{
  const pork={id:"pork",name:"Miki Guisado - Pork Lahok",category_id:groups.family,description:null,is_active:true,approval_status:"approved"};
  const db=database({menu_items:[pork],menu_variants:[{id:"pork8",menu_item_id:pork.id,name:"Good for 8",serving_label:"Good for 8",price:550,is_active:true}]});
  const plan=service.planPhotoImport(await service.readImportItems(db.client));
  assert.equal(plan.find(row=>row.source.key==="miki").servings.find(row=>row.serving.name==="Good for 8").status,"existing");
  assert.equal(plan.find(row=>row.source.key==="miki-chicken").servings.find(row=>row.serving.name==="Good for 8").status,"missing");
}
{
  const db=database({menu_items:[{id:"ambiguous",name:"Fish & Chips",category_id:groups.seafood,description:null,is_active:true,approval_status:"approved"}],
    menu_variants:[{id:"unknown-size",menu_item_id:"ambiguous",name:"Regular",serving_label:"Regular serving",price:250,is_active:true}]});
  assert.equal(service.planPhotoImport(await service.readImportItems(db.client)).find(row=>row.source.key==="fish-chips").status,"review");
  await service.importApprovedPhoto(db.client,{},await fingerprint(db),["fish-chips"]);
  assert.equal(db.control.writes.length,0);
}
{
  const existing=[{id:"old-miki",name:"MIKI GUISADO",category_id:groups.pancit,description:"Keep photo and history",is_active:true,approval_status:"approved"},
    {id:"old-canton",name:"Canton - Bihon",category_id:groups.pancit,description:null,is_active:false,approval_status:"pending"}];
  const db=database({menu_items:existing, inventory:[{id:"old-stock",menu_variant_id:"old-variant",current_stock:7,reserved_stock:2}]});
  const oldHash=JSON.stringify(db.tables.menu_items);
  const result=await service.importApprovedPhoto(db.client,groups,await fingerprint(db),allKeys);
  assert.equal(result.filter(row=>row.status==="created").length,itemCount-1);
  assert.equal(JSON.stringify(db.tables.menu_items.filter(row=>row.id.startsWith("old-"))),oldHash);
  assert.deepEqual(db.tables.inventory[0],{id:"old-stock",menu_variant_id:"old-variant",current_stock:7,reserved_stock:2});
  assert(db.tables.inventory.slice(1).every(row=>row.current_stock===15 && row.reserved_stock===0));
  assert(db.control.writes.filter(row=>row.operation==="update").every(row=>row.table==="menu_items" && row.ids.every(id=>ids.includes(id))));
  const before=JSON.stringify(db.tables);
  const retry=await service.importApprovedPhoto(db.client,groups,await fingerprint(db),allKeys);
  assert(retry.every(row=>row.status==="skipped")); assert.equal(JSON.stringify(db.tables),before);
}
{
  const db=database(); db.control.failInventoryAt=2;
  const first=await service.importApprovedPhoto(db.client,groups,await fingerprint(db),allKeys);
  assert.equal(first.length,1); assert.equal(first[0].status,"failed");
  assert.equal(db.tables.menu_items[0].is_active,false);
  db.tables.inventory[0].current_stock=12; // A changed balance must never be reset.
  const retry=await service.importApprovedPhoto(db.client,groups,await fingerprint(db),allKeys);
  assert.equal(retry.filter(row=>row.status==="created").length,itemCount);
  assert.equal(db.tables.menu_items.length,itemCount); assert.equal(db.tables.menu_variants.length,servingCount);
  assert.equal(db.tables.inventory.length,servingCount); assert.equal(db.tables.inventory[0].current_stock,12);
  assert(db.tables.menu_items.every(row=>row.is_active));
}
{
  const db=database(); const fp=await fingerprint(db);
  await Promise.all([service.importApprovedPhoto(db.client,groups,fp,allKeys),service.importApprovedPhoto(db.client,groups,fp,allKeys)]);
  assert.equal(db.tables.menu_items.length,itemCount); assert.equal(db.tables.menu_variants.length,servingCount); assert.equal(db.tables.inventory.length,servingCount);
  assert(db.tables.inventory.every(row=>row.current_stock===15));
}
{
  const db=database(); await assert.rejects(service.importApprovedPhoto(db.client,groups,"stale",allKeys),/Menu changed/);
  await assert.rejects(service.importApprovedPhoto(db.client,{...groups,chicken:"bad"},await fingerprint(db),allKeys),/Choose valid/);
  await assert.rejects(service.importApprovedPhoto(db.client,groups,await fingerprint(db),["unapproved-item"]),/Select at least/);
  assert.equal(db.control.writes.length,0);
  db.control.readError=true; await assert.rejects(service.readImportItems(db.client),/Menu comparison/);
}
{
  const db=database();
  const result=await service.importApprovedPhoto(db.client,groups,await fingerprint(db),["lumpia"]);
  assert.equal(result.filter(row=>row.status==="created").length,1);
  assert.equal(db.tables.menu_items.length,1); assert.equal(db.tables.inventory.length,1);
  const partial=database(); partial.control.failInventoryAt=1;
  await service.importApprovedPhoto(partial.client,groups,await fingerprint(partial),["miki"]);
  partial.tables.menu_variants[0].price=999;
  const failed=await service.importApprovedPhoto(partial.client,groups,await fingerprint(partial),["miki"]);
  assert.equal(failed[0].status,"skipped"); assert.equal(partial.tables.menu_items[0].is_active,false);
  assert.equal(partial.tables.menu_variants[0].price,999);
}
{
  const db=database({menu_items:[{id:"old-lechon",name:"Lechon Guisado",category_id:groups.pancit,description:null,is_active:true,approval_status:"approved"}]});
  assert.equal(service.planPhotoImport(await service.readImportItems(db.client)).find(row=>row.source.key==="lechon-miki").similar.length,1);
  let serviceCalls=0;
  const actions=load("src/app/menu/bulk-add/actions.ts", {
    "next/cache": { revalidatePath:()=>{} }, "@/lib/auth": { requireRole:async()=>{throw Error("Access denied");} },
    "@/lib/supabase/admin":{createAdminClient:()=>{serviceCalls++;return db.client;}}, "@/lib/menu-photo-import":service,
    "@/lib/approved-menu-photo":photo,
  });
  await assert.rejects(actions.importMenuPhoto(new FormData()),/Access denied/); assert.equal(serviceCalls,0);
}
{
  let calls=0;
  const actions=load("src/app/menu/bulk-add/actions.ts", {
    "next/cache":{revalidatePath:()=>{}}, "@/lib/auth":{requireRole:async roles=>assert.deepEqual(roles,["admin"])},
    "@/lib/supabase/admin":{createAdminClient:()=>{calls++; throw Error("Unexpected privileged call");}},
    "@/lib/menu-photo-import":service,"@/lib/approved-menu-photo":photo,
  });
  assert((await actions.importMenuPhoto(new FormData())).error.includes("Confirm"));
  const tooMany=new FormData(); tooMany.set("confirmed","yes");
  for (const key of allKeys.slice(0,6)) tooMany.append("itemKey",key);
  assert((await actions.importMenuPhoto(tooMany)).error.includes("up to 5"));
  assert.equal(calls,0);
  const ui=fs.readFileSync("src/app/menu/bulk-add/import-form.tsx","utf8");
  assert(ui.includes("offset += 5") && ui.includes("response.nextFingerprint") && ui.includes("if (lockRef.current) return"));
  assert(!fs.readFileSync("src/app/menu/page.tsx","utf8").includes("Import approved menu photo"));
}
console.log(`PASS Photos 1–10 bulk add: ${itemCount} items / ${servingCount} serving entries, admin guard, selected missing items/servings, normalized/alias comparison, existing inactive/pending items and stock preserved, 15 per new serving, fixed-ID retries/concurrency, staged recovery without stock reset, stale preview/read/category failures, changed-serving protection and similar-name review. Mocked services only; no working or hosted database writes.`);
