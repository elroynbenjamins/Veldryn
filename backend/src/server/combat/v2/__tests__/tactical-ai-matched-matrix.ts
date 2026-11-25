/** Matched tactical AI versus authored-priority selection. Hidden synthetic
 * gear/receipt policies, not production balance or release certification. */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatResult} from '../../types';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {selectReviewSkillLoadoutV2} from '../ability-counterplay-strategies';
import {simulateUnifiedEquipmentCombatV2,type TrustedPartySyncRehearsalV2} from '../unified-equipment-encounter';
import {PARTY_SYNCHRONIZATION_RULESET_V2} from '../party-synchronization';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';

const classes=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const damage=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
function metrics(r:CombatResult){
 const sum=(f:(p:CombatResult['players'][number])=>number)=>r.players.reduce((n,p)=>n+f(p),0);
 const playerIds=new Set(r.players.map(p=>p.definition.id));
 const gain=r.events.filter(e=>e.type==='resource_gain').reduce((n,e)=>n+(e.resourceAfter??0)-(e.resourceBefore??0),0);
 const spend=r.events.filter(e=>e.type==='resource_spend').reduce((n,e)=>n+(e.resourceBefore??0)-(e.resourceAfter??0),0);
 return {damage:sum(p=>p.damageDone),healing:sum(p=>p.healingDone),hpFraction:sum(p=>p.hp/Math.max(1,p.definition.stats.maxHp))/r.players.length,
  alive:sum(p=>Number(p.alive)),interrupts:sum(p=>p.interrupts),gain,spend,
  absorbed:r.events.filter(e=>e.targetId&&playerIds.has(e.targetId)).reduce((n,e)=>n+(e.absorbed??0),0),duration:r.durationMs,victory:Number(r.victory)};
}
type Metrics=ReturnType<typeof metrics>;
type Result=ReturnType<typeof simulateUnifiedEquipmentCombatV2>;
type MatchedRow={label:string;base:Metrics;next:Metrics;changed:boolean};
let cases=0,changed=0;const rows:MatchedRow[]=[];
function pair(label:string,standard:Result,tactical:Result,replay:Result){
 assert.deepEqual(tactical,replay,label+' deterministic replay');
 assert.deepEqual(standard.equipmentEvidence,tactical.equipmentEvidence,label+' unchanged gear');
 assert.deepEqual(standard.combat.players.map(p=>p.definition),tactical.combat.players.map(p=>p.definition));
 assert.deepEqual(standard.combat.enemies.map(p=>p.definition),tactical.combat.enemies.map(p=>p.definition));
 for(const result of [standard,tactical]){
  assert.ok(result.combat.events.length<20000,label+' bounded event count');
  for(const p of [...result.combat.players,...result.combat.enemies]){
   assert.ok(Number.isFinite(p.hp)&&p.hp>=0&&p.hp<=p.definition.stats.maxHp+.001);
   assert.ok(Number.isFinite(p.shield)&&p.shield>=0);
   assert.ok(Number.isFinite(p.damageDone)&&Number.isFinite(p.healingDone));
   if(p.combatV2)assert.ok(p.combatV2.stacks>=0&&p.combatV2.stacks<=p.combatV2.maxStacks);
  }
 }
 const base=metrics(standard.combat),next=metrics(tactical.combat);
 for(const m of [base,next])assert.ok(Object.values(m).every(Number.isFinite));
 const different=JSON.stringify(standard.combat.events)!==JSON.stringify(tactical.combat.events);
 changed+=Number(different);cases++;
 rows.push({label,base,next,changed:different});
}
for(const c of classes)for(const spec of [0,1] as const)for(const boss of bosses)
 for(const profile of profiles)for(const strategy of ['generic','targeted'] as const){
  const f=setup(c,spec,boss,profile);
  const choice=selectReviewSkillLoadoutV2(c,f.build.selected.specializationId!,f.actor,boss.id,strategy);
  const build={...f.build,selected:{...f.build.selected,activeSkills:choice.activeSkills}};
  const frozen=JSON.stringify({input:f.input,selected:build.selected,gear:f.runtime.instancesById});
  const input={...f.input,maxDurationMs:20000};
  const run=(policy:'tactical'|'authored-priority')=>simulateUnifiedEquipmentCombatV2(input,[build],[f.runtime],true,f.trustedKit,f.signedPort,undefined,undefined,policy);
  pair(['solo',c,spec,boss.id,profile.rarity,strategy].join('|'),run('authored-priority'),run('tactical'),run('tactical'));
  assert.equal(JSON.stringify({input:f.input,selected:build.selected,gear:f.runtime.instancesById}),frozen);
 }
assert.equal(cases,432);
for(const spec of [0,1] as const)for(const tank of tanks)for(const support of supports)
 for(let a=0;a<damage.length;a++)for(let b=a+1;b<damage.length;b++)for(const boss of bosses){
  const ids=[tank,damage[a],damage[b],support];
  const fixtures=ids.map(c=>setup(c,spec,boss,profiles[1]));
  const builds=fixtures.map((f,i)=>({...f.build,selected:{...f.build.selected,
   activeSkills:selectReviewSkillLoadoutV2(ids[i],f.build.selected.specializationId!,f.actor,boss.id,'targeted').activeSkills}}));
  const runtime=fixtures.map(f=>f.runtime);
  const input={seed:'AI_MATRIX_'+spec+'_'+boss.id+'_'+ids.join('_'),players:fixtures.map(f=>f.actor),
   enemies:fixtures[0].input.enemies,maxDurationMs:20000,tickMs:100};
  const scope:TrustedPartySyncRehearsalV2['scope']={ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,encounterId:'AI_MATRIX_'+cases,partyId:'AI_MATRIX_PARTY',
   revision:1,seed:input.seed,mode:'dungeon' as const,members:ids.map((classId,i)=>({
    actorId:input.players[i].id,characterId:runtime[i].characterId,classId}))};
  const frozen=JSON.stringify({input,builds:builds.map(b=>b.selected),gear:runtime.map(r=>r.instancesById)});
  const run=(policy:'tactical'|'authored-priority')=>simulateUnifiedEquipmentCombatV2(input,builds,runtime,true,undefined,undefined,'dungeon',
   {scope,verifyPersisted:()=>true},policy);
  pair(['party',spec,boss.id,...ids].join('|'),run('authored-priority'),run('tactical'),run('tactical'));
  assert.equal(JSON.stringify({input,builds:builds.map(b=>b.selected),gear:runtime.map(r=>r.instancesById)}),frozen);
 }
assert.equal(cases,864);
assert.ok(changed>0,'comparison must exercise tactical decisions');
// Baseline switch does not change legacy outcomes.
const legacy=setup('WAYFINDER',0,bosses[0],profiles[0]).input;
assert.deepEqual(simulateCombat(legacy),simulateCombat(legacy,undefined,undefined,undefined,'authored-priority'));
// Emit diagnostics, not an arbitrary win-rate guarantee. Per-case results
// allow calibration of tradeoffs and investigation of negative outliers.
function summarize(kind:string,subset:MatchedRow[]){
 assert.ok(subset.length);
 const total=(field:keyof Metrics,which:'base'|'next')=>subset.reduce((n,r)=>n+r[which][field],0);
 const keys=Object.keys(subset[0].base) as (keyof Metrics)[];
 return {kind,cases:subset.length,changed:subset.filter(r=>r.changed).length,
  victoryGains:subset.filter(r=>r.next.victory>r.base.victory).length,
  victoryLosses:subset.filter(r=>r.next.victory<r.base.victory).length,
  survivalGains:subset.filter(r=>r.next.alive>r.base.alive).length,
  survivalLosses:subset.filter(r=>r.next.alive<r.base.alive).length,
  meanHpDelta:subset.reduce((n,r)=>n+r.next.hpFraction-r.base.hpFraction,0)/subset.length,
  totals:Object.fromEntries(keys.map(k=>[k,{standard:total(k,'base'),tactical:total(k,'next')}]))};
}
const groups=['solo','party'].map(kind=>summarize(kind,rows.filter(r=>r.label.startsWith(kind+'|'))));
const perClass=classes.map(c=>summarize(c,rows.filter(r=>r.label.startsWith('solo|'+c+'|'))));
const perBoss=bosses.map(b=>summarize(b.id,rows.filter(r=>r.label.split('|').includes(b.id))));
const regressions=rows.filter(r=>r.next.victory<r.base.victory||r.next.alive<r.base.alive||
 r.next.hpFraction<r.base.hpFraction-.15||
 (r.base.damage>0&&r.next.damage<r.base.damage*.85))
 .sort((a,b)=>(a.next.victory-a.base.victory)-(b.next.victory-b.base.victory)||
 (a.next.alive-a.base.alive)-(b.next.alive-b.base.alive)||
 (a.next.hpFraction-a.base.hpFraction)-(b.next.hpFraction-b.base.hpFraction));
console.log(JSON.stringify({kind:'MATCHED_TACTICAL_AI_DIAGNOSTIC_NOT_RELEASE_BALANCE',cases,changed,groups,perClass,perBoss,
 flaggedRegressions:regressions.length,reviewFirst:regressions.slice(0,20).map(r=>r.label)}));
for(const row of rows)console.log(JSON.stringify({kind:'MATCHED_TACTICAL_AI_CASE',...row}));
