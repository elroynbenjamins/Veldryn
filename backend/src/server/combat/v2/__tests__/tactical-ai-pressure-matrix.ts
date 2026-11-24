/** Hidden synthetic persisted-party pressure rehearsal. Not production tuning. */
import {strict as assert} from 'node:assert';
import type {CombatInput,CombatResult,CombatantDefinition} from '../../types';
import type {FrozenLoadoutSnapshot} from '../../../coop/loadout-snapshots';
import type {ReadyCheckRecord,ReadyRosterMember} from '../../../coop/ready-checks';
import type {ClassIdV2} from '../build-contract';
import {CLASS_ROLES_V2} from '../build-contract';
import {simulateUnifiedEquipmentPersistedPartyCombatV2,type TrustedPersistedPartyExecutionV2} from '../unified-equipment-encounter';
import {selectReviewSkillLoadoutV2} from '../ability-counterplay-strategies';
import {preparePartyEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';

const parties:readonly (readonly ClassIdV2[])[]=[
 ['IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER'],
 ['BASTION','RAVAGER','KNIFE_DANCER','DAWNKEEPER'],
 ['DREADGUARD','HEXWEAVER','RAVAGER','STONECALLER'],
];
// Relative to the average unequipped class HP, before actual defense,
// coefficients, authored phases, traits or party bonuses. These are
// diagnostic pressure inputs, not proposed production stat values.
const bands=[{id:'moderate',attack:.16},{id:'heavy',attack:.30},{id:'severe',attack:.50}] as const;
function measure(r:CombatResult){
 const playerIds=new Set(r.players.map(p=>p.definition.id));
 const sum=(f:(p:CombatResult['players'][number])=>number)=>r.players.reduce((n,p)=>n+f(p),0);
 const of=(type:'resource_gain'|'resource_spend')=>r.events.filter(e=>e.type===type&&playerIds.has(e.actorId??''))
  .reduce((n,e)=>n+Math.abs((e.resourceAfter??0)-(e.resourceBefore??0)),0);
 return {victory:Number(r.victory),alive:sum(p=>Number(p.alive)),
  hp:sum(p=>p.hp/Math.max(1,p.definition.stats.maxHp))/r.players.length,
  damage:sum(p=>p.damageDone),healing:sum(p=>p.healingDone),interrupts:sum(p=>p.interrupts),
  absorbed:r.events.filter(e=>playerIds.has(e.targetId??'')).reduce((n,e)=>n+(e.absorbed??0),0),
  gain:of('resource_gain'),spend:of('resource_spend'),duration:r.durationMs,
  enemyHp:r.enemies[0].hp/Math.max(1,r.enemies[0].definition.stats.maxHp),
  phaseCount:r.events.filter(e=>e.type==='phase').length,
  criticalLoss:r.events.filter(e=>e.type==='down').length,
  zeroHeals:r.events.filter(e=>e.type==='heal'&&playerIds.has(e.actorId??'')&&(e.amount??0)===0).length,
  bossCastStarts:r.events.filter(e=>e.type==='cast_start'&&e.actorId===r.enemies[0].definition.id).length,
  traitEvents:r.events.filter(e=>e.type==='equipment_trait_trigger').length};
}
type Metric=ReturnType<typeof measure>;
type Row={boss:string;party:number;spec:number;band:string;seedIndex:number;standard:Metric;tactical:Metric};
const rows:Row[]=[];
for(const [partyIndex,ids] of parties.entries())for(const spec of [0,1] as const)
 for(const boss of bosses)for(const band of bands)for(const seedIndex of [0,1]){
  const f=ids.map(c=>setup(c,spec,boss,profiles[1]));
  const players=f.map(x=>x.actor),runtime=f.map(x=>x.runtime),traitPorts=f.map(x=>x.signedPort);
  const builds=f.map((x,i)=>({...x.build,selected:{...x.build.selected,
   activeSkills:selectReviewSkillLoadoutV2(ids[i],x.build.selected.specializationId!,x.actor,boss.id,'targeted').activeSkills}}));
  const averageHp=players.reduce((n,p)=>n+p.stats.maxHp,0)/players.length;
  const partyAttack=players.reduce((n,p)=>n+p.stats.attackPower,0);
  const raw=f[0].input.enemies[0];
  const enemy:CombatantDefinition={...raw,stats:{...raw.stats,
   attackPower:Math.round(averageHp*band.attack),maxHp:Math.round(partyAttack*24)}};
  const suffix=[partyIndex,spec,boss.id,band.id,seedIndex].join('_');
  const seed='AI_PRESSURE_'+suffix,runId='RUN_AI_'+suffix,nodeId='BOSS';
  const input:CombatInput={seed,players,enemies:[enemy],maxDurationMs:90000,tickMs:100};
  const candidate=preparePartyEnemyKitsV2(input.enemies,{
   ruleset:ENEMY_V2_RULESET,serverSeed:seed,encounterId:runId+':'+nodeId,
   region:boss.region,equipmentTier:boss.tier,eliteEnemyIds:[]});
  const snapshot:PersistedEnemyKitV2={...candidate,source:'server-persisted-v2',revision:3};
  const roster:ReadyRosterMember[]=ids.map((classId,i)=>({
   accountId:traitPorts[i].accountId,characterId:runtime[i].characterId,
   ticketId:'TICKET_'+i,role:CLASS_ROLES_V2[classId],originalEnqueuedAtMs:1,
   loadoutId:'LOADOUT_'+i,loadoutRevision:11,loadoutSnapshotHash:'c'.repeat(63)+i}));
  const readyCheck:ReadyCheckRecord={id:'READY_AI',partyId:'PARTY_AI',rosterRevision:5,
   roster,accepts:Object.fromEntries(roster.map(r=>[r.accountId,true])),
   status:'committed',openedAtMs:1,closesAtMs:1000};
  const frozenRoster=ids.map((classId,i)=>({
   accountId:roster[i].accountId,characterId:roster[i].characterId,classId,
   loadoutId:roster[i].loadoutId,revision:roster[i].loadoutRevision,
   snapshotHash:roster[i].loadoutSnapshotHash,readiness:{role:CLASS_ROLES_V2[classId]},
  } as unknown as FrozenLoadoutSnapshot));
  const party:TrustedPersistedPartyExecutionV2={runId,nodeId,encounterRevision:3,stateRevision:7,
   contentVersion:'content_v2',balanceVersion:'balance_v2',readyCheck,frozenRoster,traitPorts,
   enemyKit:{snapshot,verifyPersisted:(_row,digest)=>/^[0-9a-f]{64}$/.test(digest)},
   verifyPersisted:(binding,_sources,digest)=>binding.runId===runId&&digest===binding.combatInputDigest};
  const frozen=JSON.stringify({input,builds:builds.map(x=>x.selected),snapshot,
   items:runtime.map(r=>r.instancesById)});
  const run=(policy:'tactical'|'authored-priority')=>simulateUnifiedEquipmentPersistedPartyCombatV2(
   input,builds,runtime,party,true,true,policy);
  const standard=run('authored-priority'),tactical=run('tactical'),replay=run('tactical');
  assert.deepEqual(tactical,replay,suffix+' deterministic replay');
  assert.deepEqual(standard.equipmentEvidence,tactical.equipmentEvidence);
  assert.deepEqual(standard.partyPersistenceReview,tactical.partyPersistenceReview);
  assert.deepEqual(standard.combat.players.map(p=>p.definition),tactical.combat.players.map(p=>p.definition));
  assert.deepEqual(standard.combat.enemies.map(p=>p.definition),tactical.combat.enemies.map(p=>p.definition));
  assert.equal(JSON.stringify({input,builds:builds.map(x=>x.selected),snapshot,
   items:runtime.map(r=>r.instancesById)}),frozen);
  for(const result of [standard,tactical]){
   assert.equal(result.equipmentEvidence.length,4);
   assert.ok(result.equipmentEvidence.every(e=>e.baseSources.length===10));
   assert.equal(result.synchronizationRehearsal?.releaseEnabled,false);
   assert.ok(result.enemyMechanicLabels.length>0);
   assert.ok(result.combat.events.length<30000,suffix+' bounded events');
   for(const p of [...result.combat.players,...result.combat.enemies]){
    assert.ok(Number.isFinite(p.hp)&&p.hp>=0&&p.hp<=p.definition.stats.maxHp+.001);
    assert.ok(Number.isFinite(p.shield)&&p.shield>=0);
    assert.ok(Number.isFinite(p.damageDone)&&Number.isFinite(p.healingDone));
    if(p.combatV2)assert.ok(p.combatV2.stacks>=0&&p.combatV2.stacks<=p.combatV2.maxStacks);
   }
  }
  const base=measure(standard.combat),next=measure(tactical.combat);
  assert.ok([...Object.values(base),...Object.values(next)].every(Number.isFinite));
  rows.push({boss:boss.id,party:partyIndex,spec,band:band.id,seedIndex,standard:base,tactical:next});
 }
assert.equal(rows.length,216);
const fields=Object.keys(rows[0].standard) as (keyof Metric)[];
function summary(key:string,group:Row[]){
 return {key,cases:group.length,standardPhaseExposure:group.filter(r=>r.standard.phaseCount>0).length,
  tacticalPhaseExposure:group.filter(r=>r.tactical.phaseCount>0).length,
  lostVictories:group.filter(r=>r.tactical.victory<r.standard.victory).length,
  lostSurvivors:group.filter(r=>r.tactical.alive<r.standard.alive).length,
  totals:Object.fromEntries(fields.map(k=>[k,{standard:group.reduce((n,r)=>n+r.standard[k],0),
    tactical:group.reduce((n,r)=>n+r.tactical[k],0)}]))};
}
const flagged=rows.filter(r=>r.tactical.victory<r.standard.victory||
 r.tactical.alive<r.standard.alive||r.tactical.hp<r.standard.hp-.15||
 (r.standard.damage>0&&r.tactical.damage<r.standard.damage*.85));
console.log(JSON.stringify({kind:'TACTICAL_AI_PERSISTED_PRESSURE_NOT_RELEASE_BALANCE',
 cases:rows.length,seedReplicates:2,maxDurationMs:90000,flagged:flagged.length,
 byBand:bands.map(b=>summary(b.id,rows.filter(r=>r.band===b.id))),
 byBoss:bosses.map(b=>summary(b.id,rows.filter(r=>r.boss===b.id)))}));
for(const row of rows)console.log(JSON.stringify({kind:'TACTICAL_AI_PRESSURE_CASE',...row}));
