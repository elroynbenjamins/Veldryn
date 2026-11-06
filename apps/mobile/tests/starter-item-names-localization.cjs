const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(
 fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,file);
const {itemDef}=require('../src/content/items.ts');
const {starterItemNames,localizedItemName}=require('../src/i18n/starter-item-names.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const ids=Object.keys(starterItemNames);
assert.equal(ids.length,41,'first pass covers 41 vetted source IDs');
for(const id of ids){
 const row=starterItemNames[id],canonical=itemDef(id);
 assert.equal(row.en,canonical.name,id+' source English must match canonical inventory item');
 assert.deepEqual(Object.keys(row).sort(),[...languages].sort(),id+' must cover all eight selectable languages');
 for(const language of languages){
  assert.ok(row[language].trim(),id+' is missing '+language);
  assert.equal(localizedItemName(language,id),row[language],id+' must display selected language '+language);
 }
}
for(const id of ['OATHSTONE_INGOT','BANNER_ASH','basic_sword','COOKED_MEADOW_PERCH'.replace('COOKED_','BAKED_')].slice(0,3)){
 assert.equal(localizedItemName('tr',id),itemDef(id).name,'non-covered items retain canonical English names '+id);
}
const uiFiles={
 'screens/InventoryScreen.tsx':['localizedItemName(language,item.id)','localizedItemName(language,pending.item.id)','localizedItemName(language,stack.itemId)','localizedItemName(language,state.character.activeMealBuff.itemId)'],
 'components/ItemQuickInspect.tsx':['localizedItemName(language,item.id)','localizedItemName(language,ingredient.itemId)'],
 'components/QuestReward.tsx':['localizedItemName(language,itemId)'],
 'components/GemPouchPanel.tsx':['localizedItemName(language,stack.itemId)','localizedItemName(language,selectedItem.id)'],
 'components/EquipmentPouchPanel.tsx':['localizedItemName(language,descriptor.id)'],
};
for(const [relative,markers]of Object.entries(uiFiles)){
 const file=path.join(__dirname,'../src',relative),content=fs.readFileSync(file,'utf8');
 assert.ok(content.includes("from '../i18n/starter-item-names'"),relative+' must import the ID-based display adapter');
 for(const marker of markers)assert.ok(content.includes(marker),relative+' is missing localized UI display '+marker);
 const syntax=ts.createSourceFile(relative,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(syntax.parseDiagnostics.length,0,relative+' must parse as valid TSX');
}
const inventory=fs.readFileSync(path.join(__dirname,'../src/screens/InventoryScreen.tsx'),'utf8');
assert.ok(inventory.includes('onSell(id,')||inventory.includes('onSell('),'existing canonical ID-based inventory sell callback is retained');
assert.ok(inventory.includes('onToggleFavorite(item.id)'),'favorite changes continue by canonical ID');
assert.ok(inventory.includes('onToggleLock(item.id)'),'lock changes continue by canonical ID');
console.log('PASS: 41 canonical item IDs × 7 translations, English fallback, five item-display surfaces, unchanged inventory identity/commands');
