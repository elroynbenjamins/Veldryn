const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(
 fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,file);
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {itemDef,ITEMS}=require('../src/content/items.ts');
const {WINTER_HEARTH_GUILD_RELEASED}=require('../src/core/release-flags.ts');
const {NOVICE_ITEMS}=require('../src/content/novice-sets.ts');
const {starterItemNames,allItemNames,localizedItemName,seasonalItemNames}=require('../src/i18n/starter-item-names.ts');
const {expandedItemNamesA}=require('../src/i18n/expanded-item-names-a.ts');
const {expandedItemNamesB}=require('../src/i18n/expanded-item-names-b.ts');
const langs=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],langs,'eight supported UI languages');
const initial=Object.keys(starterItemNames),a=Object.keys(expandedItemNamesA),b=Object.keys(expandedItemNamesB);
assert.equal(initial.length,41,'original starter item names intact');
assert.equal(a.length,35,'part A has exact reviewed size');
assert.equal(b.length,35,'part B has exact reviewed size');
assert.equal(new Set([...initial,...a,...b]).size,111,'no overlapping item IDs');
const baseNames={...starterItemNames,...expandedItemNamesA,...expandedItemNamesB};
assert.equal(Object.keys(baseNames).length,111,'complete authored base item display coverage');
assert.ok(Object.keys(allItemNames).length>=111,'combined registry retains all base items');
const content=fs.readFileSync(path.join(__dirname,'../src/content/items.ts'),'utf8');
const base=[...content.matchAll(/\{id:'([^']+)',name:'([^']+)',type:'([^']+)'/g)];
const names=new Map(base.map(x=>[x[1],x[2]]));
const seasonalId='FROSTFALL_CHRISTMAS_LIGHTS_2026';
assert.equal(names.size,112,'base and authored seasonal catalog layout changed: update localization coverage');
assert.deepEqual(Object.keys(seasonalItemNames),[seasonalId]);
assert.equal(seasonalItemNames[seasonalId].en,names.get(seasonalId),'Seasonal English name matches the authored source');
assert.deepEqual(Object.keys(seasonalItemNames[seasonalId]).sort(),langs.slice().sort());
for(const lang of langs)assert.ok(seasonalItemNames[seasonalId][lang].trim());
assert.equal(ITEMS.some(item=>item.id===seasonalId),WINTER_HEARTH_GUILD_RELEASED,'Seasonal localization does not release the item');
if(WINTER_HEARTH_GUILD_RELEASED)for(const lang of langs)assert.equal(localizedItemName(lang,seasonalId),seasonalItemNames[seasonalId][lang]);
names.delete(seasonalId);
assert.deepEqual(Object.keys(baseNames).sort(),[...names.keys()].sort(),'no missing base item source IDs');
for(const [id,entry] of Object.entries(baseNames)){
 assert.equal(entry.en,names.get(id),'source name changed for '+id);
 assert.equal(itemDef(id).name,entry.en,'canonical runtime English source changed for '+id);
 assert.deepEqual(Object.keys(entry).sort(),langs.slice().sort(),'missing language for '+id);
 for(const lang of langs){
  assert.ok(entry[lang].trim(),lang+' empty: '+id);
  assert.equal(localizedItemName(lang,id),entry[lang],id+' wrong '+lang);
 }
}
const novice=NOVICE_ITEMS.find(x=>!Object.hasOwn(allItemNames,x.id));
assert.ok(novice,'test needs non-cataloged equipment');
assert.equal(localizedItemName('tr',novice.id),itemDef(novice.id).name,'untranslated unique gear retains original name');
const adapter=fs.readFileSync(path.join(__dirname,'../src/i18n/starter-item-names.ts'),'utf8');
assert.ok(adapter.includes('row.en===item.name'),'source mismatch fallback must prevent stale translations');
assert.ok(adapter.includes('Object.prototype.hasOwnProperty.call(allItemNames,itemId)'),'item lookup must be ID based');
for(const relative of ['components/ItemQuickInspect.tsx','screens/InventoryScreen.tsx','components/QuestReward.tsx','components/GemPouchPanel.tsx','components/EquipmentPouchPanel.tsx']){
 const screen=fs.readFileSync(path.join(__dirname,'../src',relative),'utf8');
 assert.ok(screen.includes('localizedItemName(language,'),'new content must reach '+relative);
 const ast=ts.createSourceFile(relative,screen,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(ast.parseDiagnostics.length,0,relative+' valid JSX');
}
console.log('PASS: all 111 base items and the gated seasonal item have exact source-guarded names in all eight languages; non-cataloged unique equipment falls back');
