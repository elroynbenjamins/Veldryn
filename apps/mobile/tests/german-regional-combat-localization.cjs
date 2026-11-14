const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

require.extensions['.ts']=function(module,filename){
 const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 module._compile(compiled,filename);
};

const {germanCoverageText}=require('../src/i18n/german-coverage.ts');
const app=path.resolve(__dirname,'..');
const source=file=>fs.readFileSync(path.join(app,file),'utf8');
const catalog=source('src/core/regional-combat-catalog-v1.ts');
const panel=source('src/components/RegionalCombatPanel.tsx');
const authored=[...catalog.matchAll(/\{id:'REGCOM_[^']+',zoneId:'[^']+',kind:'[^']+',name:'([^']+)',level:\d+,contentId:'[^']+',summary:'([^']+)'/g)];
assert.equal(authored.length,5,'Unexpected Sunscar encounter catalog size');
for(const [,name,summary] of authored){
 assert.notEqual(germanCoverageText(name),undefined,'Untranslated encounter name: '+name);
 assert.notEqual(germanCoverageText(summary),undefined,'Untranslated encounter summary: '+summary);
 assert.notEqual(germanCoverageText(name),name,'Encounter name has no German text: '+name);
 assert.notEqual(germanCoverageText(summary),summary,'Encounter summary has no German text: '+summary);
}
for(const label of [
 'Special encounters','Optional battles for rare gems and materials, separate from idle hunts.',
 'GEM · GRADE','Independent roll','Gem pity','guaranteed within','eligible victories',
 'Cadence','boss clears remaining','Ready in','Boss phase','Cast','Interrupt',
 'Combatant','Attack','Heal','Shield','CRIT','WIPE','TIMEOUT','DMG','HP',
 'The encounter timed out. Improve your loadout and try again.',
 'Your character was defeated. Improve gear, Gems or class progression and retry.',
 'Victory recorded. No Gem reward was rolled on this clear.','Pity guaranteed · ',
 'New Effect Gem recipe discovered','Duplicate recipe · +','Gem Dust','Regional Catalyst',
 'Victory recorded. Gem pity progress updated.',
 'Rewards are granted automatically after a victory.',
])assert.notEqual(germanCoverageText(label),undefined,'Missing German regional combat source: '+label);

for(const expected of [
 "gl('Special encounters')","gl(encounter.name)","gl(encounter.summary)",
 "gl('GEM · GRADE')","gl('Independent roll')","gl('Gem pity')",
 "gl('eligible victories')","gl('between starts')","gl('boss clears remaining')",
 "gl('DMG')","gl('HP')","cueText(cue,gl)","rewardText(last.result,gl)",
 "setNotice(rewardText(result,gl))","gl('Rewards are granted automatically after a victory.')",
 "gl('Ready in')"
])assert.ok(panel.includes(expected),'Unlocalized panel callsite: '+expected);
assert.ok(panel.includes("cue.targetName??text('Combatant')"),'Replay target names must not be transformed');
assert.ok(panel.includes("cue.actorName??text('Attack')"),'Replay actor names must not be transformed');
assert.ok(panel.includes('encounter.zoneId.slice(-3)'), 'Encounter zone ID should stay canonical');
assert.ok(panel.includes('regionalCombatAvailabilityV1(encounter,cadenceRow,projectedNow)'), 'Server cadence calculation must stay unchanged');
assert.ok(panel.includes('runRegionalCombatV1(state.character.id,encounterId)'), 'Server-authoritative combat must stay unchanged');
console.log('PASS: German Sunscar regional combat, 5 authored encounters, UI and reward/replay labels');
