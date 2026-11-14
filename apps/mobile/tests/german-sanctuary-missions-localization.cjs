const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const app=path.resolve(__dirname,'..');
const root=path.resolve(app,'../..');
require.extensions['.ts']=function(mod,filename){
 const out=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(out,filename);
};
const {germanCompanionMissionNames,companionMissionDisplayName}=require('../src/i18n/companion-missions-de.ts');
const catalog=fs.readFileSync(path.join(root,'backend/src/server/companions/content.ts'),'utf8');
const missionList=catalog.slice(catalog.indexOf('export const COMPANION_MISSIONS:'),catalog.indexOf('export const companionMission='));
assert.ok(missionList.startsWith('export const COMPANION_MISSIONS:'),'Mission source catalogue missing');
const missions=[...missionList.matchAll(/\{id:'(MISSION_[^']+)',name:'([^']+)'/g)].map(([,id,name])=>({id,name}));
assert.equal(missions.length,17,'Expected 17 authored Sanctuary Expedition missions');
assert.equal(Object.keys(germanCompanionMissionNames).length,missions.length,'German mission coverage is incomplete');
for(const {id,name} of missions){
 const entry=germanCompanionMissionNames[id];
 assert.equal(entry?.[0],name,'Source changed; review German mission name: '+id);
 assert.ok(entry[1].length>5&&entry[1]!==name,'German mission translation missing: '+id);
 assert.equal(companionMissionDisplayName('de',id,name),entry[1],'German output missing: '+id);
 for(const language of ['en','es','nl','it','fr','ru','tr'])
  assert.equal(companionMissionDisplayName(language,id,name),name,'Other locale changed: '+id+' / '+language);
 assert.equal(companionMissionDisplayName('de',id,'Newly renamed source $&'),'Newly renamed source $&','Source drift should fall back verbatim: '+id);
}
assert.equal(companionMissionDisplayName('de','CUSTOM_USER_MISSION','Player mission $&'),'Player mission $&');
assert.equal(companionMissionDisplayName('de','MISSION_UNKNOWN','Unknown server mission'),'Unknown server mission');
const panel=fs.readFileSync(path.join(app,'src/components/CompanionExpeditionsV50Panel.tsx'),'utf8');
for(const marker of [
 "import {companionMissionDisplayName} from '../i18n/companion-missions-de';",
 "const missionName=(id:string,name:string)=>companionMissionDisplayName(language,id,name)",
 "def?missionName(def.id,def.name):row.missionId",
 "missionName(row.id,row.name)+' · '+duration(row.durationMs)",
 "{missionName(row.id,row.name)}</Text>",
 "{missionName(mission.id,mission.name)}</Text>",
 "missionName(claimedReward.missionId,claimedReward.name)",
 "setClaimedReward({missionId:row.missionId,name:def?.name??row.missionId",
 "localizedItemName(language,id)",
 "localizedItemName(language,option.itemId)",
 "formatLocalizedNumber(language,value)",
 "label('Affinity')",
])assert.ok(panel.includes(marker),'Missing translated Sanctuary mission display: '+marker);
assert.equal((panel.match(/missionName\(mission.id,mission.name\)/g)||[]).length,2,'Mission name must appear in preparation and confirmation');
assert.ok(!panel.includes('{mission.name}</Text>'),'Raw mission name still rendered in a German screen');
assert.ok(!panel.includes("{row.name}</Text>"),'Raw mission board name still rendered in a German screen');
assert.ok(!panel.includes("id.replace(/_/g,' ')"),'Raw material IDs still rendered in a German screen');
const companions=fs.readFileSync(path.join(app,'src/i18n/companions.ts'),'utf8');
assert.ok(companions.includes('"Affinity":["Affinität","Afinidad","Affiniteit","Affinità","Affinité"]'));
console.log('PASS: 17 source-guarded German Sanctuary missions; board, active assignments, preparation, confirmation, receipts, a11y and items wired');
