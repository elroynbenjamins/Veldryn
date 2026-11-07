const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
}).outputText,f);
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {equipmentPouchUiRows,equipmentPouchText}=require('../src/i18n/equipment-pouch-ui.ts');
const {gemPouchUiRows,gemPouchText}=require('../src/i18n/gem-pouch-ui.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const keys=Object.keys(equipmentPouchUiRows);
assert.equal(keys.length,82,'all authored Equipment Pouch copy plus rarity and exact eligibility reasons');
const params={used:5,capacity:30,character:'PLAYER-NAME',count:7,gold:'15,000',quality:72,slot:'SLOT'};
const tokens=s=>[...s.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>m[1]).sort();
for(const key of keys){
 assert.equal(equipmentPouchText('en',key),key,'canonical English text preserved '+key);
 const row=equipmentPouchUiRows[key];assert.equal(row.length,7,key+' missing translations');
 for(const [i,lang] of languages.slice(1).entries()){
  assert.ok(row[i].trim(),lang+' empty '+key);
  assert.deepEqual(tokens(row[i]),tokens(key),lang+' interpolation mismatch '+key);
  assert.equal(equipmentPouchText(lang,key,params),
   row[i].replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g,(_,name)=>String(params[name])),
   lang+' formatting mismatch '+key);
 }
}
assert.equal(equipmentPouchText('tr','Unknown live server reason'),'Unknown live server reason','unknown server reason preserved');
for(const key of ['Previous','Next','Upgrade','Maxed','Next: {count} slots','Level {level} · {gold} Gold','Lock','Unlock']){
 assert.ok(Object.hasOwn(gemPouchUiRows,key),'shared locale source '+key);
 for(const lang of languages)assert.equal(equipmentPouchText(lang,key,params),gemPouchText(lang,key,params),lang+' shared label '+key);
}
const core=fs.readFileSync(path.join(__dirname,'../src/core/equipment-pouch-selling.ts'),'utf8');
const serverReasons=[...new Set([...core.matchAll(/throw new Error\('([^']+)'\)/g)].map(m=>m[1]))];
assert.ok(serverReasons.length>=8,'guard existing error coverage');
for(const text of serverReasons)assert.ok(Object.hasOwn(equipmentPouchUiRows,text),'missing client display text for '+text);
const screen=fs.readFileSync(path.join(__dirname,'../src/components/EquipmentPouchPanel.tsx'),'utf8');
for(const marker of [
 "equipmentPouchText(language,text,params)",
 "p('Equipment Pouch')",
 "p('Select safe to sell')",
 "p('Quick-selects only eligible Common, Uncommon and Rare gear. Epic, Legendary and Mythic need manual selection.')",
 "p('Sell selected equipment?')",
 "p('Salvage selected equipment?')",
 "p('Select safe to salvage')",
 "p('Confirm salvage')",
 "p('Selection has changed. Close and review the equipment.')",
 "p('{count} selected · {gold} Gold'",
 "p('Sell · {gold}g'",
 "p('quality {quality}'",
 "p('Protected')",
 "p('Enhanced, socketed and loadout gear cannot be sold.')",
 "p(saleCandidate?.eligible?'Selling this copy adds Gold to this character.':saleCandidate?.reason??'This equipment is protected.')"
 ])assert.ok(screen.includes(marker),'Equipment Pouch UI missing localized path '+marker);
for(const marker of [
 "equipmentPouchSaleCandidates(state)","equipmentPouchQuickSellIds(saleCandidates)",
 "confirmationValid","pendingRows.every(row=>row.eligible)",
 "onAction({type:'equipment_pouch_sell',args:{ids}})",
 "type:'equipment_pouch_move'","type:'equipment_pouch_equip'","type:'gear_equip'",
 "type:'gear_lock'","type:'inventory_preference'","type:'equipment_pouch_salvage'"
 ])assert.ok(screen.includes(marker),'canonical sale protection/action removed: '+marker);
const ast=ts.createSourceFile('EquipmentPouchPanel.tsx',screen,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(ast.parseDiagnostics.length,0,'Equipment Pouch must parse as TSX');
console.log('PASS: 82 owned Equipment Pouch templates and shared Gem Pouch keys in eight languages, 9+ sale guards and command wiring');
