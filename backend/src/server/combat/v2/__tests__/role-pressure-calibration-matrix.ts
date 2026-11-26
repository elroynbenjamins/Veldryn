/** Hidden role calibration: controlled boss pressure, no Synchronization, no CP approval. */
import {strict as assert} from 'node:assert';
import type {CombatInput,CombatResult,CombatantDefinition} from '../../types';
import type {FrozenLoadoutSnapshot} from '../../../coop/loadout-snapshots';
import type {ReadyCheckRecord,ReadyRosterMember} from '../../../coop/ready-checks';
import type {ClassIdV2} from '../build-contract';
import {CLASS_ROLES_V2} from '../build-contract';
import {CLASS_NAMES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {launchPlayer} from '../../content/launch-combat';
import {ACTION_STREAM_RNG_QA_V1} from '../../deterministic-rng';
import {observeRoleCalibrationV2,summarizeRoleCalibrationV2,type RoleCalibrationObservationV2} from '../role-power-calibration-review';
import {simulateUnifiedEquipmentPersistedPartyCombatV2,type TrustedPersistedPartyExecutionV2} from '../unified-equipment-encounter';
import {selectReviewSkillLoadoutV2} from '../ability-counterplay-strategies';
import {preparePartyEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';

const classes=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const damage=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
const parties:ClassIdV2[][]=[];
for(const tank of tanks)for(const support of supports)
 for(let i=0;i<damage.length;i++)for(let j=i+1;j<damage.length;j++)
  parties.push([tank,damage[i],damage[j],support]);
assert.equal(parties.length,36);
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
type Row={boss:string;party:number;spec:number;band:string;seedIndex:number;metrics:Metric};
const rows:Row[]=[];
const observations=new Map<string,RoleCalibrationObservationV2[]>();
const fixedReference=new Map(bosses.map(boss=>{
 const roster=classes.map(c=>launchPlayer(CLASS_NAMES_V2[c],boss.level));
 return [boss.id,{averageHp:roster.reduce((n,p)=>n+p.stats.maxHp,0)/roster.length,
  partyAttack:4*roster.reduce((n,p)=>n+p.stats.attackPower,0)/roster.length}] as const;
}));
for(const [partyIndex,ids] of parties.entries())for(const spec of [0,1] as const)
 for(const boss of bosses)for(const band of bands)for(const seedIndex of [0,1]){
  const f=ids.map(c=>setup(c,spec,boss,profiles[1]));
  const players=f.map(x=>x.actor),runtime=f.map(x=>x.runtime),traitPorts=f.map(x=>x.signedPort);
  const builds=f.map((x,i)=>({...x.build,selected:{...x.build.selected,
   activeSkills:selectReviewSkillLoadoutV2(ids[i],x.build.selected.specializationId!,x.actor,boss.id,'targeted').activeSkills}}));
  // One fixed reference per boss, never rescaled to the tested composition.
  const {averageHp,partyAttack}=fixedReference.get(boss.id)!;
  const raw=f[0].input.enemies[0];
  const enemy:CombatantDefinition={...raw,stats:{...raw.stats,
   attackPower:Math.round(averageHp*band.attack),maxHp:Math.round(partyAttack*24)}};
  const suffix=[partyIndex,spec,boss.id,band.id,seedIndex].join('_');
  const seed='ROLE_PRESSURE_'+suffix,runId='RUN_ROLE_'+suffix,nodeId='BOSS';
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
  const run=()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
   input,builds,runtime,party,true,false,'tactical',ACTION_STREAM_RNG_QA_V1);
  const result=run();
  // One fixed replay sample per boss/band/spec; all original RNG matrix
  // cases already verify the full deterministic replay contract.
  if(partyIndex===0&&seedIndex===0)assert.deepEqual(result,run(),suffix+' deterministic replay');
  assert.equal(result.combat.events[0].detail,ACTION_STREAM_RNG_QA_V1);
  assert.equal(JSON.stringify({input,builds:builds.map(x=>x.selected),snapshot,
   items:runtime.map(r=>r.instancesById)}),frozen);
  {
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
  const metrics=measure(result.combat);
  assert.ok(Object.values(metrics).every(Number.isFinite));
  rows.push({boss:boss.id,party:partyIndex,spec,band:band.id,seedIndex,metrics});
  const bandRows=observations.get(band.id)??[];
  for(const [i,classId] of ids.entries()){
   const specialization=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[spec];
   bandRows.push(observeRoleCalibrationV2(result.combat,{
    caseId:suffix,bossId:boss.id,classId,specializationId:specialization.id,actorId:players[i].id,
   }));
  }
  observations.set(band.id,bandRows);
 }
assert.equal(rows.length,36*2*6*3*2);
const fields=Object.keys(rows[0].metrics) as (keyof Metric)[];
function summary(key:string,group:Row[]){
 return {key,cases:group.length,phaseExposure:group.filter(r=>r.metrics.phaseCount>0).length,
  bossCastExposure:group.filter(r=>r.metrics.bossCastStarts>0).length,
  totals:Object.fromEntries(fields.map(k=>[k,group.reduce((n,r)=>n+r.metrics[k],0)]))};
}
console.log('ROLE_PRESSURE_MATRIX '+JSON.stringify({kind:'ROLE_PRESSURE_NOT_CP_OR_RELEASE',
 policy:ACTION_STREAM_RNG_QA_V1,synchronization:false,caseCount:rows.length,seedReplicates:2,
 compositionCount:36,bossCount:6,specializationBands:2,pressureBands:bands,
 fixedReference:Object.fromEntries(fixedReference),maxDurationMs:90000,
 byBand:bands.map(b=>summary(b.id,rows.filter(r=>r.band===b.id))),
 byBoss:bosses.map(b=>summary(b.id,rows.filter(r=>r.boss===b.id)))}));
for(const band of bands){
 const report=summarizeRoleCalibrationV2(observations.get(band.id)!);
 assert.equal(report.observations,36*2*6*2*4);
 assert.equal(report.cells.length,18*6);
 assert.ok(report.cells.every(c=>c.peerClassSpecs===(c.role==='tank'?6:c.role==='damage'?8:4)));
 assert.equal(report.cpApproved,false);
 console.log('ROLE_PRESSURE_CALIBRATION '+JSON.stringify({band:band.id,...report}));
}
