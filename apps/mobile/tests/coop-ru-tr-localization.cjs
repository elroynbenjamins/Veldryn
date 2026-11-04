const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText,filename);
const {ct,coopPolicyText,COOP_MESSAGE_COUNT}=require('../src/i18n/coop.ts');
const {clt,COOP_LOADOUT_MESSAGE_COUNT}=require('../src/i18n/coop-loadout.ts');
const {dungeonText}=require('../src/i18n/dungeon-preparation.ts');
const {coopEarlyRows}=require('../src/i18n/coop-early-locales.ts');
const {coopLoadoutEarlyRows}=require('../src/i18n/coop-loadout-early-locales.ts');
const {dungeonPreparationEarlyRows}=require('../src/i18n/dungeon-preparation-early-locales.ts');
const placeholders=value=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match=>match[1]).sort();
const assertCatalog=(name,rows,expectedCount,englishValue,translatedValue)=>{
 const keys=Object.keys(rows);
 assert.equal(keys.length,expectedCount,name+' coverage must include every English source key');
 for(const key of keys){
  const english=englishValue(key);
  for(const [index,language] of ['ru','tr'].entries()){
   const value=rows[key][index];
   assert.ok(typeof value==='string'&&value.trim(),name+' '+language+': '+key);
   assert.deepEqual(placeholders(value),placeholders(english),name+' placeholders '+language+': '+key);
   assert.equal(translatedValue(language,key),value,name+' runtime wiring '+language+': '+key);
  }
 }
};
assertCatalog('Co-op expedition browser',coopEarlyRows,COOP_MESSAGE_COUNT,key=>ct('en',key),(lang,key)=>ct(lang,key));
assertCatalog('Co-op loadout',coopLoadoutEarlyRows,COOP_LOADOUT_MESSAGE_COUNT,key=>clt('en',key),(lang,key)=>clt(lang,key));
assert.equal(Object.keys(dungeonPreparationEarlyRows).length,30,'All 30 preparation labels must be covered');
for(const [key,values] of Object.entries(dungeonPreparationEarlyRows)){
 for(const [index,language] of ['ru','tr'].entries()){
  assert.ok(values[index].trim(),language+' empty preparation string: '+key);
  assert.deepEqual(placeholders(values[index]),placeholders(key),language+' preparation placeholders: '+key);
  assert.equal(dungeonText(language,key),values[index],language+' preparation wiring: '+key);
 }
}
// Dynamic values and gameplay constraints survive localization unchanged.
assert.equal(ct('ru','browse.levels',{min:7,recommended:14}),'Минимум 7 · Рекомендуется 14');
assert.equal(ct('tr','details.modeSelected',{mode:'Q-Mode',tier:3}),'Q-Mode seçildi · Kademe 3');
assert.equal(ct('ru','details.liveAutoSelected',{tier:2}),'Выбран Live · автоматическая ступень 2');
assert.equal(ct('tr','browse.regionProgress',{available:2,total:5}),'Açık: 2/5');
assert.equal(clt('ru','missing_tank_capability'),'Требуются навыки удержания угрозы и защиты.');
assert.equal(clt('tr','verification_pending'),'Sunucu doğrulaması devam ediyor.');
assert.equal(dungeonText('ru','Find Party'),'Найти группу');
assert.equal(dungeonText('tr','Prepare expedition'),'Sefere hazırlan');
assert.equal(dungeonText('de','Start Dungeon'),'Dungeon starten','Preserve existing German copy');
assert.equal(dungeonText('nl','Recommended power'),'Aanbevolen kracht','Preserve existing Dutch copy');
assert.equal(coopPolicyText('ru','durationValue'),'6–8 минут');
assert.equal(coopPolicyText('tr','durationValue'),'6–8 dakika');
for(const language of ['ru','tr'])for(const key of ['duration','durationValue','rewardCadence','fellowshipLabel','fellowshipCopy']){
 assert.ok(coopPolicyText(language,key).trim(),language+' missing dungeon policy '+key);
}
assert.ok(coopPolicyText('ru','rewardCadence').includes('12'),'Preserve weekly charge count');
assert.ok(coopPolicyText('tr','fellowshipCopy').includes('25'),'Preserve Live Fellowship reward percentage');
console.log('PASS: '+Object.keys(coopEarlyRows).length+' expedition + '+Object.keys(coopLoadoutEarlyRows).length+' loadout + '+Object.keys(dungeonPreparationEarlyRows).length+' preparation keys across Russian and Turkish.');
