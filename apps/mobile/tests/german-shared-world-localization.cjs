const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

require.extensions['.ts']=function(mod,filename){
 const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(compiled,filename);
};

const {GERMAN_SHARED_WORLD_AUTHORED_COPY,sharedWorldAuthoredText}=require('../src/i18n/shared-world-authored-de.ts');
const app=path.resolve(__dirname,'..');
const root=path.resolve(app,'../..');
const source=filename=>fs.readFileSync(filename,'utf8');
const boss=source(path.join(root,'backend/src/server/shared-world/world-bosses.ts'));
const crisis=source(path.join(root,'backend/src/server/shared-world/regional-crises.ts'));

const definitions=[
 ...[...boss.matchAll(/id:'world_boss_[^']+',version:\d+,name:'([^']+)',regionId:'[^']+',description:'([^']+)'/g)]
  .map(([,name,description])=>({kind:'boss',name,description})),
 ...[...boss.matchAll(/\{id:'phase_[^']+',startsAtHpFraction:[^,]+,name:'([^']+)',description:'([^']+)'/g)]
  .map(([,name,description])=>({kind:'boss phase',name,description})),
 ...[...crisis.matchAll(/id:'crisis_[^']+',version:\d+,name:'([^']+)',regionId:'[^']+',description:'([^']+)'/g)]
  .map(([,name,description])=>({kind:'crisis',name,description})),
 ...[...crisis.matchAll(/\{id:'(?:response|turning_point|secured)',thresholdFraction:[^,]+,name:'([^']+)',description:'([^']+)'/g)]
  .map(([,name,description])=>({kind:'crisis stage',name,description})),
];
assert.deepEqual(definitions.reduce((counts,definition)=>(counts[definition.kind]=(counts[definition.kind]??0)+1,counts),{}),
 {'boss':2,'boss phase':3,'crisis':3,'crisis stage':3},'Shared World authoritative template definitions changed');

for(const {kind,name,description} of definitions){
 for(const english of [name,description]){
  const german=sharedWorldAuthoredText('de',english);
  assert.ok(german&&german!==english,'Untranslated authored '+kind+': '+english);
  for(const locale of ['en','es','nl','it','fr','ru','tr'])
   assert.equal(sharedWorldAuthoredText(locale,english),english,'Other language changed: '+locale+' / '+english);
 }
}
assert.equal(Object.keys(GERMAN_SHARED_WORLD_AUTHORED_COPY).length,27,'Unexpected German Shared World source set');
for(const label of ['Crisis Ended','secured','HP remaining','fight','fights'])
 assert.notEqual(sharedWorldAuthoredText('de',label),label,'Untranslated status or counter: '+label);
assert.equal(sharedWorldAuthoredText('de','Custom player text!'),'Custom player text!','Player text must not be translated');
assert.equal(sharedWorldAuthoredText('de','Unknown boss phase'),'Unknown boss phase','Unknown server text must be retained');

const worldPanel=source(path.join(app,'src/components/WorldBossPanel.tsx'));
const crisisPanel=source(path.join(app,'src/components/RegionalCrisisPanel.tsx'));
const hub=source(path.join(app,'src/components/SharedWorldHubPanel.tsx'));
for(const expected of ['authored(boss.name)','authored(boss.phaseName)'])
 assert.ok(worldPanel.includes(expected),'Unlocalized World Boss panel: '+expected);
for(const expected of ['authored(crisis.name)','authored(crisisStatusLabel(crisis))'])
 assert.ok(crisisPanel.includes(expected),'Unlocalized Regional Crisis panel: '+expected);
for(const expected of [
 'authored(c.name)','authored(c.currentStageName)','authored(b.name)','authored(b.phaseName)',
 "p('REGIONAL CRISIS ·')","p('WORLD BOSS ·')",
 "authored('secured')","authored('HP remaining')",
 "authored(Math.max(0,b.dailyAttemptCap-b.attemptsToday)===1?'fight':'fights')"
]) assert.ok(hub.includes(expected),'Shared World overview has an English-only callsite: '+expected);
for(const file of [worldPanel,crisisPanel,hub])assert.ok(file.includes("import {sharedWorldAuthoredText} from '../i18n/shared-world-authored-de';"),'Server source translator disconnected');
console.log('PASS: 11 source-checked boss/crisis templates and 5 hub statuses; German-only UI wiring');
