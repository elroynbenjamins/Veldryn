const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText,filename);
const {equipmentMaterialMetadataRows,equipmentMaterialMetadataText}=require('../src/i18n/equipment-metadata.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const source='EQUIPMENT 2.0 · T1/T2/T3 MATERIAL';
const sourceRange='EQUIPMENT 2.0 · T2–T9 MATERIAL';
assert.deepEqual(Object.keys(equipmentMaterialMetadataRows).sort(),[...SUPPORTED_LANGUAGES].sort());
for(const language of SUPPORTED_LANGUAGES){
 const row=equipmentMaterialMetadataRows[language];
 assert.equal(row.split('{tiers}').length,2,language+' requires one tier placeholder');
 assert.equal(equipmentMaterialMetadataText(language,source),row.replace('{tiers}','T1/T2/T3'));
 assert.equal(equipmentMaterialMetadataText(language,sourceRange),row.replace('{tiers}','T2–T9'));
}
assert.equal(equipmentMaterialMetadataText('en',source),source,'English label unchanged');
assert.equal(equipmentMaterialMetadataText('de','PLAYER EQUIPMENT 2.0 · T1 MATERIAL'),undefined,'Unrelated text must not be rewritten');
assert.equal(equipmentMaterialMetadataText('tr','EQUIPMENT 2.0 · IGNORE MATERIAL'),undefined,'Only valid tiers can be substituted');
assert.equal(equipmentMaterialMetadataText('nl','EQUIPMENT 2.0 · T0 MATERIAL'),undefined,'Unsupported tiers must not match');
const gameplay=fs.readFileSync(path.join(__dirname,'../src/i18n/gameplay.ts'),'utf8');
assert.ok(gameplay.includes("import {equipmentMaterialMetadataText} from './equipment-metadata';"),'Gameplay translator must import Equipment 2.0 metadata');
assert.ok(gameplay.includes('equipmentMaterialMetadataText(language,value)'),'Gameplay presentation must route Equipment 2.0 metadata through the translator');

const {itemDetailRows,itemDetailText,itemDetailContent}=require('../src/i18n/item-details.ts');
const {EARLY_LOCALE_ROWS,earlyLocaleText}=require('../src/i18n/early-locales.ts');
const fields=x=>[...x.matchAll(/\{(\w+)\}/g)].map(v=>v[1]).sort();
assert.equal(Object.keys(itemDetailRows).length,64,'all authored item-inspector source keys');
for(const key of Object.keys(itemDetailRows)){
 const params=Object.fromEntries(fields(key).map(name=>[name,'TEST_'+name]));
 const expected=key.replace(/\{(\w+)\}/g,(_,name)=>params[name]);
 assert.equal(itemDetailText('en',key,params),expected,'English item details unchanged');
 for(const language of ['ru','tr']){
  const row=earlyLocaleText(language,key);
  assert.ok(row&&row.trim(),'missing '+language+' item detail: '+key);
  assert.deepEqual(fields(row),fields(key),'placeholder drift '+language+' '+key);
  assert.equal(itemDetailText(language,key,params),row.replace(/\{(\w+)\}/g,(_,name)=>params[name]),'translated value '+language+' '+key);
 }
}
assert.equal(itemDetailText('de','gear'),'Ausrüstung','existing German source translation intact');
assert.equal(itemDetailText('nl','gear'),'Uitrusting','existing Dutch source translation intact');
assert.equal(itemDetailText('fr','gear'),'Équipement','existing French source translation intact');
assert.equal(itemDetailText('tr','Owned · {total} total · {carried} carried · {banked} banked',{total:9,carried:4,banked:5}),'Sahip olunan: 9 · yanında: 4 · bankada: 5');
assert.equal(itemDetailContent('ru','Restores 35 HP',value=>value),'Восстанавливает 35 ОЗ');
assert.equal(itemDetailContent('tr','Salvage: 2× Ironwood Log',value=>value),'Geri dönüşüm: 2× Ironwood Log','never translate variable item names');
assert.ok(itemDetailContent('ru','Effect Gem · Unreviewed custom skill',value=>value).includes('Unreviewed custom skill'),'unknown effect name is opaque');
assert.equal(itemDetailContent('ru','Unreviewed server item name',value=>value),'Unreviewed server item name','unknown server copy remains untouched');
assert.equal(earlyLocaleText('ru','Attack'),'Атака','preserve existing starter translations');
assert.equal(earlyLocaleText('tr','HP'),'CAN','preserve existing starter translations');

console.log('PASS: equipment tier metadata and 64 item-detail labels in all eight languages');
