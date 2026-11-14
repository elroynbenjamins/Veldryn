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
const {
 germanCompanionCombatNames,germanCompanionTechniqueNames,germanCompanionCombatDescriptions,germanCompanionLegacySignatures,germanCompanionTrialAbilities,
 companionCombatAbilityName,companionCombatBondName,companionTechniqueName,companionCombatDescriptionText,companionTrialAbilityName,
}=require('../src/i18n/companion-combat-names-de.ts');
const source=path=>fs.readFileSync(path,'utf8');
const core=source(path.join(app,'src/content/combat-companions.ts'));
const event=source(path.join(app,'src/content/event-companions-v2.ts'));
const guild=source(path.join(app,'src/content/guild-companions-v1.ts'));
const backend=source(path.join(root,'backend/src/server/companions/content.ts'));
const trialSource=source(path.join(root,'backend/src/server/companions/trials.ts'));
const aster=core.slice(core.indexOf('const ASTERFALL_COMPANIONS:'),core.indexOf('const REGIONAL_ASCENSION_MATERIALS'));
const asterRows=[...aster.matchAll(/\{id:'(UNIT_\d+)'[\s\S]*?activeAbility:ability\('([^']+)',(?:"([^"]+)"|'([^']+)')[\s\S]*?bondTrait:trait\('([^']+)',(?:"([^"]+)"|'([^']+)')/g)]
 .map(m=>({id:m[1],active:m[3]||m[4],bond:m[6]||m[7]}));
const regional=core.slice(core.indexOf('const REGIONAL_IDENTITY_COPY:'),core.indexOf('const REGIONAL_IDENTITY_COPY:')+7500);
const regionalRows=[...regional.matchAll(/(UNIT_\d+):\{activeName:(?:"([^"]+)"|'([^']+)')[\s\S]*?bondName:(?:"([^"]+)"|'([^']+)')/g)]
 .map(m=>({id:m[1],active:m[2]||m[3],bond:m[4]||m[5]}));
const eventRows=[...event.slice(event.indexOf('const EVENT_IDENTITY_COPY:'),event.indexOf('const effectFor'))
 .matchAll(/(EVT_UNIT_\d+):\{activeName:(?:"([^"]+)"|'([^']+)')[\s\S]*?bondName:(?:"([^"]+)"|'([^']+)')/g)]
 .map(m=>({id:m[1],active:m[2]||m[3],bond:m[4]||m[5]}));
const guildRows=[...guild.matchAll(/id:'(GUILD_UNIT_\d+)'[\s\S]*?activeName:(?:"([^"]+)"|'([^']+)')[\s\S]*?bondName:(?:"([^"]+)"|'([^']+)')/g)]
 .map(m=>({id:m[1],active:m[2]||m[3],bond:m[4]||m[5]}));
assert.deepEqual([asterRows.length,regionalRows.length,eventRows.length,guildRows.length],[12,12,11,3]);
const rows=[...asterRows,...regionalRows,...eventRows,...guildRows];
assert.equal(rows.length,38,'Expected 38 authored companions');
assert.deepEqual(Object.keys(germanCompanionCombatNames).sort(),rows.map(row=>row.id).sort(),'German combat-name ID coverage drifted');
for(const {id,active,bond} of rows){
 const copy=germanCompanionCombatNames[id];
 assert.equal(copy?.active[0],active,'Active ability source drift: '+id);
 assert.equal(copy?.bond[0],bond,'Bond trait source drift: '+id);
 assert.ok(copy.active[1]&&copy.active[1]!==active,'Untranslated active ability: '+id);
 assert.ok(copy.bond[1]&&copy.bond[1]!==bond,'Untranslated bond trait: '+id);
 assert.equal(companionCombatAbilityName('de',id,active),copy.active[1]);
 assert.equal(companionCombatBondName('de',id,bond),copy.bond[1]);
 for(const language of ['en','es','nl','it','fr','ru','tr']){
  assert.equal(companionCombatAbilityName(language,id,active),active,'Unintended language change: '+id);
  assert.equal(companionCombatBondName(language,id,bond),bond,'Unintended language change: '+id);
 }
 assert.equal(companionCombatAbilityName('de',id,'New server skill $&'),'New server skill $&');
 assert.equal(companionCombatBondName('de',id,'New server trait $&'),'New server trait $&');
}
assert.equal(companionCombatAbilityName('de','CUSTOM_PLAYER_ID','My skill $&'),'My skill $&');

const asterServerNames=[...backend.matchAll(/\['(UNIT_\d{3})',(?:"([^"]+)"|'([^']+)'),'(?:damage|tank|support)'/g)]
 .filter(m=>Number(m[1].slice(-3))<=12&&!/^UNIT_\d{3}$/.test(m[2]||m[3])).map(m=>({id:m[1],name:m[2]||m[3]}));
assert.equal(asterServerNames.length,12,'Expected 12 original server companion signatures');
assert.deepEqual(Object.keys(germanCompanionLegacySignatures).sort(),asterServerNames.map(row=>row.id).sort());
for(const {id,name} of asterServerNames){
 assert.equal(germanCompanionLegacySignatures[id],name,'Source companion signature drift: '+id);
 assert.equal(companionCombatAbilityName('de',id,name+' Signature'),'Spezialfähigkeit: '+name);
 assert.equal(companionCombatAbilityName('en',id,name+' Signature'),name+' Signature');
 assert.equal(companionCombatAbilityName('de',id,name+' New Signature'),name+' New Signature');
}
const {companionContent}=require('../src/i18n/companions.ts');
const descriptions=Object.entries(germanCompanionCombatDescriptions);
assert.equal(descriptions.length,16,'Expected 16 new German authored descriptions');
for(const [english,german] of descriptions){
 assert.ok((core+event+guild+backend).includes(english),'Source description drift: '+english);
 assert.ok(german.length>20&&german!==english,'Description has not been translated: '+english);
 assert.equal(companionCombatDescriptionText('de',english),german);
 assert.equal(companionCombatDescriptionText('en',english),undefined);
 assert.equal(companionContent('de',english),german,'German content display missing: '+english);
 assert.equal(companionContent('en',english),english);
}
assert.equal(companionCombatDescriptionText('de','Untrusted text $&'),undefined);

const customTechniques=[...backend.matchAll(/suffix:'[^']+',name:(?:"([^"]+)"|'([^']+)')/g)].map(m=>m[1]||m[2]);
assert.equal(customTechniques.length,52);
const defaults=['Fortified Shell','Reflective Shell','Executioner','Relentless','Deep Restoration','Rapid Aid'];
const names=[...customTechniques,...defaults];
assert.equal(new Set(names).size,58,'Technique translations should have unique English sources');
assert.deepEqual(Object.keys(germanCompanionTechniqueNames).sort(),names.sort(),'German technique coverage drifted');
for(const name of names){
 assert.ok(germanCompanionTechniqueNames[name]&&germanCompanionTechniqueNames[name]!==name,'Missing German technique: '+name);
 assert.equal(companionTechniqueName('de','UNIT_013_EXECUTIONER',name),germanCompanionTechniqueNames[name]);
 assert.equal(companionTechniqueName('en','UNIT_013_EXECUTIONER',name),name);
}
assert.equal(companionTechniqueName('de','UNKNOWN_ID','Venom Ambush'),'Venom Ambush');
assert.equal(companionTechniqueName('de','UNIT_013_EXECUTIONER','Unknown server technique $&'),'Unknown server technique $&');

const trialNames=Object.entries(germanCompanionTrialAbilities);
assert.equal(trialNames.length,22,'Expected 22 authored Trial ability and phase names');
for(const [english,german] of trialNames){
 assert.ok(trialSource.includes('name:\''+english+'\'')||trialSource.includes('name:"'+english+'"'),
  'Trial enemy ability or phase changed: '+english);
 assert.ok(german.length>4&&german!==english,'Untranslated Trial ability: '+english);
 assert.equal(companionTrialAbilityName('de',english),german);
 for(const language of ['en','es','nl','it','fr','ru','tr'])
  assert.equal(companionTrialAbilityName(language,english),english);
}
assert.equal(companionTrialAbilityName('de','Unknown server boss spell $&'),'Unknown server boss spell $&');

const components={
 training:source(path.join(app,'src/components/CompanionTrainingV50Panel.tsx')),
 codex:source(path.join(app,'src/components/CombatCompanionPanel.tsx')),
 trials:source(path.join(app,'src/components/CompanionTrialStage.tsx')),
};
const markers={
 training:[
  'companionCombatAbilityName(language,model.def.id,model.def.activeAbility.name)',
  'companionCombatBondName(language,model.def.id,model.def.bondTrait.name)',
  'companionTechniqueName(language,technique.id,technique.name)',
 ],
 codex:[
  'summary={companionCombatAbilityName(language,model.def.id,model.def.activeAbility.name)}',
  '{companionCombatAbilityName(language,model.def.id,model.def.activeAbility.name)}</Text>',
  'companionTrialAbilityName(language,phase.name)',
  'phase.effects.map(effect=>companionContent(language,effect))',
 ],
 trials:['companionCombatAbilityName(language,def.id,def.activeAbility.name)',"companionCombatAbilityName(language,event.actorId??'',playback.abilityNames[event.abilityId??'']",'companionCombatAbilityName(language,unit.id,unit.casting)','companionTrialAbilityName(language,ability.name)','Math.round(unit.hp).toLocaleString(language)'],
};
for(const [component,needed] of Object.entries(markers)){
 for(const marker of needed)
  assert.ok(components[component].includes(marker),component+' lost German combat name integration: '+marker);
}
console.log('PASS: 38 German companion active abilities and Bond traits, 58 techniques, 12 replay signatures, 16 missing descriptions, 22 Trial enemy abilities/phases and battle presentation wiring');
