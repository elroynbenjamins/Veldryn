const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
}).outputText,f);
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {disposalPreviewUiRows,disposalPreviewText}=require('../src/i18n/disposal-preview-ui.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const tokens=s=>[...s.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>m[1]).sort();
for(const [key,row] of Object.entries(disposalPreviewUiRows)){
 assert.equal(row.length,7,'All seven non-English locales must be present: '+key);
 assert.equal(disposalPreviewText('en',key),key,'English fallback: '+key);
 for(const [index,language] of languages.slice(1).entries()){
  assert.ok(row[index].trim(),language+' missing copy: '+key);
  assert.deepEqual(tokens(row[index]),tokens(key),language+' interpolation mismatch: '+key);
  assert.equal(disposalPreviewText(language,key,{count:123}),row[index].replace('{count}','123'));
 }
}
for(const language of languages)assert.ok(disposalPreviewText(language,'Epic'),'Reuse localized rarity labels');
const component=fs.readFileSync(path.join(__dirname,'../src/components/DisposalPreview.tsx'),'utf8');
const inventory=fs.readFileSync(path.join(__dirname,'../src/screens/InventoryScreen.tsx'),'utf8');
const pouch=fs.readFileSync(path.join(__dirname,'../src/components/EquipmentPouchPanel.tsx'),'utf8');
const confirm=fs.readFileSync(path.join(__dirname,'../src/components/ConfirmModal.tsx'),'utf8');
for(const [name,source] of [['DisposalPreview',component],['InventoryScreen',inventory],['EquipmentPouchPanel',pouch],['ConfirmModal',confirm]]){
 const ast=ts.createSourceFile(name+'.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(ast.parseDiagnostics.length,0,name+' must parse as valid TSX');
}
for(const marker of ['formatLocalizedNumber(language,n)','disposalPreviewText(language,key,params)','itemDef(item.itemId)','items.slice(0,3)','rewards.map(reward','GOLD TO RECEIVE','MATERIALS TO RECEIVE','This action cannot be undone.','summary.selected','summary.protected','summary.eligible','metricCard'])
 assert.ok(component.includes(marker),'Missing localized or correct receipt UI: '+marker);
assert.ok(confirm.includes('disabled={busy||confirmDisabled}'),'Stale confirmation must be disabled');
for(const key of ['SELECTED','PROTECTED','ELIGIBLE'])assert.ok(Object.hasOwn(disposalPreviewUiRows,key),'Missing localized summary label: '+key);
assert.ok(inventory.includes('bulkSelectionSummary(state,bulkPending.ids'), 'Bulk preview uses the pending selection, not changing background selection');
assert.ok(inventory.includes('confirmDisabled={!disposalSelectionValid'),'Cannot dispose changed bulk items');
assert.ok(inventory.includes('protectedUnits:Math.max(0,selectionSummary.selectedUnitCount-eligibleUnits)'),'Inventory disposal preview accounts for skipped protected units');
assert.ok(inventory.includes('protectedStacks:Math.max(0,selectionSummary.selectedStackCount-eligibleStacks)'),'Inventory protected note uses stack units');
assert.ok(pouch.includes('protected:pendingSale.protectedCount')&&pouch.includes('protected:pendingSalvage.protectedCount'),'Pouch confirmations display copy-safe exclusions');
assert.ok(pouch.includes("const selectionValid=saleCount>0;")&&pouch.includes("const salvageSelectionValid=salvageCount>0;"),'Mixed protected selection still allows eligible-only disposal');
assert.ok(pouch.includes("p('Quick sell')")&&pouch.includes("p('Quick salvage')"),'One-tap quick actions open safety confirmation');
assert.ok(inventory.includes('confirmDisabled={!copyDisposalValid'),'Cannot dispose stale exact equipment');
for(const file of [inventory,pouch]){
 assert.ok(file.includes('<DisposalPreview mode="sell"')||file.includes('<DisposalPreview mode={'), 'Sell receipt preview is present');
 assert.ok(file.includes('<DisposalPreview mode="salvage"')||file.includes('mode={pending.kind'), 'Salvage receipt preview is present');
}
console.log('PASS: localized, visually structured and stale-safe sell/salvage confirmations in eight languages');
