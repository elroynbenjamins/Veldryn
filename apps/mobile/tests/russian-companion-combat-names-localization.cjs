const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText,filename
);

const {
 russianCompanionCombatNames,russianCompanionTechniqueNames,
 russianCompanionTrialAbilities,russianCompanionCombatDescriptions
}=require('../src/i18n/companion-combat-names-ru.ts');
const {
 germanCompanionCombatNames,germanCompanionTechniqueNames,
 germanCompanionTrialAbilities,germanCompanionCombatDescriptions,
 germanCompanionLegacySignatures,
 companionCombatAbilityName,companionCombatBondName,
 companionTechniqueName,companionTrialAbilityName,companionCombatDescriptionText
}=require('../src/i18n/companion-combat-names-de.ts');
const {companionContent}=require('../src/i18n/companions.ts');

assert.equal(Object.keys(russianCompanionCombatNames).length,38);
assert.deepEqual(Object.keys(russianCompanionCombatNames).sort(),Object.keys(germanCompanionCombatNames).sort(),
 'Russian ability/trait names must match the source-verified German companion IDs');
for(const [id,entry] of Object.entries(russianCompanionCombatNames)){
 const verified=germanCompanionCombatNames[id];
 for(const type of ['active','bond']){
  assert.equal(entry[type][0],verified[type][0],'Authored source drift: '+id+' '+type);
  assert.ok(entry[type][1]!==entry[type][0]&&/[А-Яа-яЁё]/u.test(entry[type][1]),'Untranslated Russian '+id+' '+type);
 }
 assert.equal(companionCombatAbilityName('ru',id,entry.active[0]),entry.active[1]);
 assert.equal(companionCombatBondName('ru',id,entry.bond[0]),entry.bond[1]);
 assert.equal(companionCombatAbilityName('de',id,entry.active[0]),verified.active[1]);
 assert.equal(companionCombatBondName('de',id,entry.bond[0]),verified.bond[1]);
 for(const language of ['en','es','nl','it','fr','tr']){
  assert.equal(companionCombatAbilityName(language,id,entry.active[0]),entry.active[0]);
  assert.equal(companionCombatBondName(language,id,entry.bond[0]),entry.bond[0]);
 }
 assert.equal(companionCombatAbilityName('ru',id,'Renamed server skill $&'),'Renamed server skill $&');
 assert.equal(companionCombatBondName('ru',id,'Renamed server bond $&'),'Renamed server bond $&');
}
assert.equal(companionCombatAbilityName('ru','UNKNOWN_COMPANION','Player skill $&'),'Player skill $&');
for(const [id,name] of Object.entries(germanCompanionLegacySignatures)){
 assert.equal(companionCombatAbilityName('ru',id,name+' Signature'),'Особый приём: '+name,
  'Legacy Signature type must translate while preserving the canonical name');
 assert.equal(companionCombatAbilityName('ru',id,name+' Edited Signature'),name+' Edited Signature');
}
assert.equal(Object.keys(germanCompanionLegacySignatures).length,12);

assert.equal(Object.keys(russianCompanionTechniqueNames).length,58);
assert.deepEqual(Object.keys(russianCompanionTechniqueNames).sort(),Object.keys(germanCompanionTechniqueNames).sort());
for(const [english,russian] of Object.entries(russianCompanionTechniqueNames)){
 assert.ok(russian!==english&&/[А-Яа-яЁё]/u.test(russian),'Missing Russian technique: '+english);
 assert.equal(companionTechniqueName('ru','UNIT_013_EXECUTIONER',english),russian);
 assert.equal(companionTechniqueName('de','UNIT_013_EXECUTIONER',english),germanCompanionTechniqueNames[english]);
 assert.equal(companionTechniqueName('en','UNIT_013_EXECUTIONER',english),english);
}
assert.equal(companionTechniqueName('ru','UNKNOWN_PLAYER_ID','Venom Ambush'),'Venom Ambush');
assert.equal(companionTechniqueName('ru','UNIT_013_EXECUTIONER','Unknown server technique $&'),'Unknown server technique $&');

assert.equal(Object.keys(russianCompanionTrialAbilities).length,22);
assert.deepEqual(Object.keys(russianCompanionTrialAbilities).sort(),Object.keys(germanCompanionTrialAbilities).sort());
for(const [english,russian] of Object.entries(russianCompanionTrialAbilities)){
 assert.ok(russian!==english&&/[А-Яа-яЁё]/u.test(russian));
 assert.equal(companionTrialAbilityName('ru',english),russian);
 assert.equal(companionTrialAbilityName('de',english),germanCompanionTrialAbilities[english]);
 assert.equal(companionTrialAbilityName('en',english),english);
}
assert.equal(companionTrialAbilityName('ru','Unknown player boss spell'),'Unknown player boss spell');

assert.equal(Object.keys(russianCompanionCombatDescriptions).length,16);
assert.deepEqual(Object.keys(russianCompanionCombatDescriptions).sort(),Object.keys(germanCompanionCombatDescriptions).sort());
for(const [english,russian] of Object.entries(russianCompanionCombatDescriptions)){
 assert.ok(russian.length>20&&russian!==english&&/[А-Яа-яЁё]/u.test(russian));
 assert.equal(companionCombatDescriptionText('ru',english),russian);
 assert.equal(companionContent('ru',english),russian,'Russian companion UI missing authored description');
 assert.equal(companionCombatDescriptionText('de',english),germanCompanionCombatDescriptions[english]);
 assert.equal(companionCombatDescriptionText('en',english),undefined);
}
assert.equal(companionCombatDescriptionText('ru','User-authored unknown combat $&'),undefined);

// These are the production call sites shared with the existing German localization.
const componentRoot=path.resolve(__dirname,'../src/components');
const panels=[
 fs.readFileSync(path.join(componentRoot,'CompanionTrainingV50Panel.tsx'),'utf8'),
 fs.readFileSync(path.join(componentRoot,'CombatCompanionPanel.tsx'),'utf8'),
 fs.readFileSync(path.join(componentRoot,'CompanionTrialStage.tsx'),'utf8')
].join('\n');
for(const marker of ['companionCombatAbilityName(language','companionCombatBondName(language',
 'companionTechniqueName(language','companionTrialAbilityName(language'])
 assert.ok(panels.includes(marker),'Companion display wiring missing '+marker);
console.log('PASS: 38 Russian companion ability/Bond pairs, 58 techniques, 12 safe legacy Signatures, 22 Trial abilities, 16 descriptions and shared UI wiring');
