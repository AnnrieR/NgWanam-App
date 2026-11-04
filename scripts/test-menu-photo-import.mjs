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
const groups = { pancit: "category-pancit", chicken: "category-chicken" };
function database(seed = {}) {
  const tables = { menu_items: [], menu_variants: [], inventory: [], categories: [{ id: groups.pancit,name:"Pancit" },{ id:groups.chicken,name:"Chicken" }], ...structuredClone(seed) };
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
      if (columns) rows=rows.map(row=>Object.fromEntries(columns.split(',').map(key=>[key,row[key]])));
      return { data:structuredClone(rows),error:null };
    }
    return query;
  } };
  return { client,tables,control };
}
const fingerprint = async db => service.importFingerprint(await service.readImportItems(db.client));
assert.equal(photo.approvedPhotoMenu.length,20);
assert.equal(photo.approvedPhotoMenu.flatMap(row=>row.servings).length,34);
assert.equal(photo.approvedPhotoMenu.find(row=>row.key==="lumpia").servings[0].price,180);
assert.equal(photo.approvedPhotoMenu.find(row=>row.key==="lumpia").servings.length,1);
assert.equal(photo.approvedPhotoMenu.find(row=>row.key==="lechon-miki").servings.length,1);
assert.equal(photo.normalizeMenuName("Canton - Bihon"),photo.normalizeMenuName("Canton-Bihon"));
assert.equal(photo.normalizeMenuName("Sweet & Sour Chicken"),photo.normalizeMenuName("Sweet and Sour Chicken"));
assert(!photo.approvedPhotoMenu.some(row=>/siomai/i.test(row.name)));
const ids=allKeys.map(service.photoImportId); assert.equal(new Set(ids).size,20);
assert(ids.every(id=>/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/.test(id)));
{
  const existing=[{id:"old-miki",name:"MIKI GUISADO",category_id:groups.pancit,description:"Keep photo and history",is_active:true,approval_status:"approved"},
    {id:"old-canton",name:"Canton - Bihon",category_id:groups.pancit,description:null,is_active:false,approval_status:"pending"}];
  const db=database({menu_items:existing, inventory:[{id:"old-stock",menu_variant_id:"old-variant",current_stock:7,reserved_stock:2}]});
  const oldHash=JSON.stringify(db.tables.menu_items);
  const result=await service.importApprovedPhoto(db.client,groups,await fingerprint(db),allKeys);
  assert.equal(result.filter(row=>row.status==="created").length,18);
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
  assert.equal(retry.filter(row=>row.status==="created").length,20);
  assert.equal(db.tables.menu_items.length,20); assert.equal(db.tables.menu_variants.length,34);
  assert.equal(db.tables.inventory.length,34); assert.equal(db.tables.inventory[0].current_stock,12);
  assert(db.tables.menu_items.every(row=>row.is_active));
}
{
  const db=database(); const fp=await fingerprint(db);
  await Promise.all([service.importApprovedPhoto(db.client,groups,fp,allKeys),service.importApprovedPhoto(db.client,groups,fp,allKeys)]);
  assert.equal(db.tables.menu_items.length,20); assert.equal(db.tables.menu_variants.length,34); assert.equal(db.tables.inventory.length,34);
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
  assert.equal(failed[0].status,"failed"); assert.equal(partial.tables.menu_items[0].is_active,false);
  assert.equal(partial.tables.menu_variants[0].price,999);
}
{
  const db=database({menu_items:[{id:"old-lechon",name:"Lechon Guisado",category_id:groups.pancit,description:null,is_active:true,approval_status:"approved"}]});
  assert.equal(service.planPhotoImport(await service.readImportItems(db.client)).find(row=>row.source.key==="lechon-miki").similar.length,1);
  let serviceCalls=0;
  const actions=load("src/app/menu/import/actions.ts", {
    "next/cache": { revalidatePath:()=>{} }, "@/lib/auth": { requireRole:async()=>{throw Error("Access denied");} },
    "@/lib/supabase/admin":{createAdminClient:()=>{serviceCalls++;return db.client;}}, "@/lib/menu-photo-import":service,
  });
  await assert.rejects(actions.importMenuPhoto(new FormData()),/Access denied/); assert.equal(serviceCalls,0);
}
console.log("PASS photo import: exact 20-item/34-serving transcription, admin guard, selected missing items only, normalized/alias comparison, existing inactive/pending items and stock preserved, 15 per new serving, fixed-ID retries/concurrency, staged partial recovery without stock reset, stale preview/read/category failures, changed-serving protection and similar-name review. Mocked storage only; no working or hosted database writes.");
