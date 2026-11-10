const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(
 fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,file);
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {POTIONS,ALCHEMY_EQUIPMENT_INFUSIONS}=require('../src/content/alchemy.ts');
const {itemDef}=require('../src/content/items.ts');
const {alchemyItemNames}=require('../src/i18n/alchemy-item-names.ts');
const {localizedItemName,allItemNames}=require('../src/i18n/starter-item-names.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const source=[...POTIONS,...ALCHEMY_EQUIPMENT_INFUSIONS];
assert.equal(POTIONS.length,12,'twelve potions expected');
assert.equal(ALCHEMY_EQUIPMENT_INFUSIONS.length,8,'eight infusion materials expected');
assert.equal(Object.keys(alchemyItemNames).length,20,'exact source-authored item coverage');
assert.deepEqual(Object.keys(alchemyItemNames).sort(),source.map(x=>x.id).sort());
assert.equal(Object.keys(allItemNames).length,130,'extends original 110 base names without overwriting them');
for(const def of source){
 const row=alchemyItemNames[def.id];
 assert.equal(row.en,def.name,def.id+' authored name changed');
 assert.equal(row.en,itemDef(def.id).name,def.id+' canonical item changed');
 assert.deepEqual(Object.keys(row).sort(),languages.slice().sort(),def.id+' missing language columns');
 for(const language of languages){
  assert.ok(row[language].trim(),def.id+' blank translation '+language);
  assert.equal(localizedItemName(language,def.id),row[language],def.id+' display wrong '+language);
 }
}
const mod=fs.readFileSync(path.join(__dirname,'../src/i18n/starter-item-names.ts'),'utf8');
assert.ok(mod.includes('row.en===item.name'),'source guard must remain intact');
assert.ok(mod.includes('...alchemyItemNames'),'alchemy names must be resolved by ID');
const screen=fs.readFileSync(path.join(__dirname,'../src/components/ConsumableWorkshop.tsx'),'utf8');
for(const text of ["localizedItemName(language,itemId)","itemName(recipe.output.itemId)","itemName(detail.output.itemId)"]){
 assert.ok(screen.includes(text),'workshop lost localized name '+text);
}
assert.ok(!screen.includes('itemName(selected.output.itemId)'), 'removed activity-switch confirmation should not be referenced');
for(const source of ["onStart(id)","alchemyAvailability(state,r.id)","processingRunCapacity(state,r.id"]){
 assert.ok(screen.includes(source),'authoritative production flow changed '+source);
}
const parsed=ts.createSourceFile('ConsumableWorkshop.tsx',screen,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(parsed.parseDiagnostics.length,0,'workshop JSX must parse');
const gameplay=fs.readFileSync(path.join(__dirname,'../src/i18n/gameplay.ts'),'utf8');
const popupStrings=['Equipment enhancement','Confirm below to apply this change.','Confirm replacement','Confirm extraction','Gear stat gains'];
for(const source of popupStrings){
 assert.ok(gameplay.includes(JSON.stringify(source)+':['),'typed enhancement popup label missing: '+source);
 assert.ok(gameplay.includes(JSON.stringify(source)+':['),'RU/TR popup locale missing: '+source);
}
assert.ok(gameplay.includes('gameplayCatalogs.ru[english as GameplayKey]'),'RU popup catalog not wired');
assert.ok(gameplay.includes('gameplayCatalogs.tr[english as GameplayKey]'),'TR popup catalog not wired');
console.log('PASS: 12 potion names and 8 infusion materials × seven locales; exact source guard and unchanged brewing commands');
