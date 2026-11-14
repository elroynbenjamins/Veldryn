const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText,filename
);

const {russianCompanionMissionNames,russianMissionOnlyMaterials}=require('../src/i18n/companion-missions-ru.ts');
const {germanCompanionMissionNames,companionMissionDisplayName,companionMissionMaterialName}=require('../src/i18n/companion-missions-de.ts');
const source=fs.readFileSync(path.resolve(__dirname,'../../../backend/src/server/companions/content.ts'),'utf8');
const start=source.indexOf('export const COMPANION_MISSIONS:');
const end=source.indexOf('export const companionMission=',start);
assert.ok(start>=0&&end>start,'Canonical expedition source not found');
const missions=[...source.slice(start,end).matchAll(/\{id:'(MISSION_[^']+)',name:'([^']+)'/g)]
 .map(([,id,name])=>({id,name}));
assert.equal(missions.length,17,'Expected 17 authored Sanctuary missions');
assert.deepEqual(Object.keys(russianCompanionMissionNames).sort(),missions.map(m=>m.id).sort(),'Russian missions must match all authored server missions');
for(const {id,name} of missions){
 const entry=russianCompanionMissionNames[id];
 assert.equal(entry[0],name,'Review changed source for '+id);
 assert.ok(entry[1].trim()&&entry[1]!==name&&/[А-Яа-яЁё]/u.test(entry[1]),'Missing native Russian name for '+id);
 assert.equal(companionMissionDisplayName('ru',id,name),entry[1],'Mission name not translated: '+id);
 assert.equal(companionMissionDisplayName('de',id,name),germanCompanionMissionNames[id][1],'German mission translation changed: '+id);
 for(const language of ['en','es','nl','it','fr','tr'])
  assert.equal(companionMissionDisplayName(language,id,name),name,'Other language changed: '+language+' '+id);
 assert.equal(companionMissionDisplayName('ru',id,'Renamed server source $&'),'Renamed server source $&','Source-drift guard failed: '+id);
}
assert.equal(companionMissionDisplayName('ru','MISSION_UNKNOWN','Unknown server mission $&'),'Unknown server mission $&');
assert.equal(companionMissionDisplayName('ru','CUSTOM_PLAYER_MISSION','Player event {name}'),'Player event {name}');
for(const [id,value] of Object.entries(russianMissionOnlyMaterials)){
 assert.equal(companionMissionMaterialName('ru',id),value,'Russian reward material name missing: '+id);
 assert.equal(companionMissionMaterialName('de',id),id==='SUPPLIES'?'Vorräte':'Material der Begleiterzuflucht');
}
assert.equal(companionMissionMaterialName('en','SUPPLIES'),'SUPPLIES');
assert.equal(companionMissionMaterialName('tr','TRIAL_SANCTUARY_MATERIAL'),'TRIAL SANCTUARY MATERIAL');
const panel=fs.readFileSync(path.resolve(__dirname,'../src/components/CompanionExpeditionsV50Panel.tsx'),'utf8');
assert.ok(panel.includes("companionMissionDisplayName(language,id,name)"),'Live expedition screen must use guarded mission names');
assert.ok(panel.includes("companionMissionMaterialName(language,id)"),'Live expedition screen must localize reward labels');
assert.ok(!panel.includes('{mission.name}</Text>'),'Raw mission name displayed in confirmation');
console.log('PASS: 17 source-guarded Russian Sanctuary expedition names, two reward material labels, source drift, locale isolation and panel wiring');
