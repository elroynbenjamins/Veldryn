/**
 * Full persisted-party Synchronization tuning evidence.
 *
 * 36 legal dungeon class compositions × 6 authored regional bosses ×
 * 2 specialization bands = 432 matched pairs. Every pair uses the exact same
 * compiled Skills/ten-slot Equipment/exact-copy trait/boss/run binding twice;
 * only Synchronization execution is toggled.
 *
 * Still review-only synthetic gear provenance: useful for relative uplift and
 * stacking diagnostics, NOT final cross-class equal-CP release certification.
 */
import {strict as assert} from 'node:assert';
import type {CombatInput,CombatResult} from '../../types';
import type {FrozenLoadoutSnapshot} from '../../../coop/loadout-snapshots';
import type {ReadyCheckRecord,ReadyRosterMember} from '../../../coop/ready-checks';
import {CLASS_NAMES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {observeRoleCalibrationV2,summarizeRoleCalibrationV2,type RoleCalibrationObservationV2} from '../role-power-calibration-review';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {listPartySynchronizationsV2} from '../party-synchronization';
import {
 simulateUnifiedEquipmentPersistedPartyCombatV2,
 type TrustedPersistedPartyExecutionV2,
} from '../unified-equipment-encounter';
import {
 preparePartyEnemyKitsV2,type PersistedEnemyKitV2,
} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';

import {ACTION_STREAM_RNG_QA_V1,ACTION_STREAM_RNG_QA_V2} from '../../deterministic-rng';
const args=process.argv.slice(2);
const seedArgs=args.filter(a=>a.startsWith('--seed-batch='));
assert.ok(args.every(a=>a==='--action-stream-review'||a==='--full-range-review'||a==='--long-window-review'||/^--seed-batch=[123]$/.test(a))&&
 !(args.includes('--action-stream-review')&&args.includes('--full-range-review'))&&
 new Set(args).size===args.length&&seedArgs.length<=1,'unknown or duplicate matrix argument');
const seedBatch=seedArgs.length?Number(seedArgs[0].slice('--seed-batch='.length)):0;
const rngReviewPolicy=args.includes('--full-range-review')?ACTION_STREAM_RNG_QA_V2:
 args.includes('--action-stream-review')?ACTION_STREAM_RNG_QA_V1:undefined;
const rngEvidencePolicy=rngReviewPolicy??'legacy-cursor';
const reviewWindowMs=args.includes('--long-window-review')?30000:9000;
const matchedVictoryTempoRatios:number[]=[];
const tempoOutliers:{caseId:string;ratio:number}[]=[];
const classes=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const damage=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
const partyDamage=(r:CombatResult)=>r.players.reduce((n,p)=>n+p.damageDone,0);
const partyHealing=(r:CombatResult)=>r.players.reduce((n,p)=>n+p.healingDone,0);
const partyHp=(r:CombatResult)=>r.players.reduce((n,p)=>n+p.hp,0);
const pct=(a:number,b:number)=>b>0?a/b:1;

interface Bucket{
 cases:number;sumDamageRatio:number;minDamageRatio:number;maxDamageRatio:number;
 sumHealingRatio:number;damageImproved:number;survivalImproved:number;
 victoryGains:number;victoryLosses:number;identical:number;
}
const bucket=():Bucket=>({cases:0,sumDamageRatio:0,minDamageRatio:Infinity,maxDamageRatio:0,
 sumHealingRatio:0,damageImproved:0,survivalImproved:0,victoryGains:0,victoryLosses:0,identical:0});
const byLinks=new Map<number,Bucket>(),byBoss=new Map<string,Bucket>();
const pairCounts=new Map<string,number>();
let cases=0,overall=bucket(),maxLinks=0;
const roleObservations:RoleCalibrationObservationV2[]=[];
const balanceViolations:{caseId:string;metric:'damage'|'healing';ratio:number}[]=[];
const isDamageOutlier=(r:number)=>!Number.isFinite(r)||r<.85||r>=1.50;
const isHealingOutlier=(r:number)=>!Number.isFinite(r)||r<.80||r>=1.60;
// Compare action identity/time separately from numeric output. The existing
// RNG uses an ordered cursor, so a scheduling divergence can change later draws.
// This trace is evidence, not a conclusion about the cause of an outlier.
const relevantActions=new Set(['damage','miss','heal','shield','dot_tick','hot_tick','cast_start','cast_complete','interrupt','death','down','phase','resource_gain','resource_spend','equipment_trait_trigger']);
function trace(r:CombatResult){
 const events=r.events.filter(e=>relevantActions.has(e.type));
 return {
  reason:r.reason,victory:r.victory,durationMs:r.durationMs,
  totalDamage:partyDamage(r),totalHealing:partyHealing(r),remainingHp:partyHp(r),
  players:r.players.map(p=>({id:p.definition.id,classId:p.definition.classId,role:p.definition.role,
   alive:p.alive,hp:p.hp,maxHp:p.definition.stats.maxHp,shield:p.shield,
   damage:p.damageDone,healing:p.healingDone,damageTaken:p.damageTaken,interrupts:p.interrupts,
   resourceStacks:p.combatV2?.stacks,
   actions:Object.entries(events.filter(e=>e.actorId===p.definition.id).reduce<Record<string,{count:number;amount:number}>>((acc,e)=>{
    const k=e.type+':'+(e.abilityId??'');const row=acc[k]??={count:0,amount:0};
    row.count++;row.amount+=e.amount??0;return acc;
   },{})).sort(([a],[b])=>a.localeCompare(b))})),
  enemies:r.enemies.map(p=>({id:p.definition.id,hp:p.hp,maxHp:p.definition.stats.maxHp,shield:p.shield,alive:p.alive,phases:p.triggeredPhases})),
  timeline:events.map(e=>({t:e.atMs,type:e.type,actor:e.actorId,target:e.targetId,ability:e.abilityId,amount:e.amount,crit:e.critical,detail:e.detail})),
 };
}
function diagnose(base:CombatResult,sync:CombatResult){
 const a=trace(base),b=trace(sync);
 const key=(e:typeof a.timeline[number]|undefined)=>e?JSON.stringify([e.t,e.type,e.actor,e.target,e.ability]):'END';
 let i=0;while(i<Math.max(a.timeline.length,b.timeline.length)&&key(a.timeline[i])===key(b.timeline[i]))i++;
 const {timeline:at,...baseSummary}=a,{timeline:bt,...syncSummary}=b;
 return {base:baseSummary,sync:syncSummary,firstActionDivergence:i<Math.max(at.length,bt.length)?{
   index:i,base:at.slice(Math.max(0,i-3),i+8),sync:bt.slice(Math.max(0,i-3),i+8),
  }:null};
}


function add(row:Bucket,base:CombatResult,sync:CombatResult,damageRatio:number,healingRatio:number){
 row.cases++;row.sumDamageRatio+=damageRatio;row.sumHealingRatio+=healingRatio;
 row.minDamageRatio=Math.min(row.minDamageRatio,damageRatio);
 row.maxDamageRatio=Math.max(row.maxDamageRatio,damageRatio);
 const bd=partyDamage(base),sd=partyDamage(sync),bh=partyHp(base),sh=partyHp(sync);
 row.damageImproved+=Number(sd>bd+.01);row.survivalImproved+=Number(sh>bh+.01);
 row.victoryGains+=Number(!base.victory&&sync.victory);
 row.victoryLosses+=Number(base.victory&&!sync.victory);
 row.identical+=Number(JSON.stringify(base.events)===JSON.stringify(sync.events));
}

for(const specIndex of [0,1] as const)
 for(const tank of tanks)for(const support of supports)
  for(let first=0;first<damage.length;first++)for(let second=first+1;second<damage.length;second++)
   for(const boss of bosses){
    const ids:[ClassIdV2,ClassIdV2,ClassIdV2,ClassIdV2]=
      [tank,damage[first],damage[second],support];
    const fixtures=ids.map(classId=>setup(classId,specIndex,boss,profiles[1]));
    const players=fixtures.map(x=>x.actor);
    const builds=fixtures.map(x=>x.build);
    const runtime=fixtures.map(x=>x.runtime);
    const traitPorts=fixtures.map(x=>x.signedPort);
    const caseId='PERSIST_SYNC_'+specIndex+'_'+boss.id+'_'+ids.join('_');
    const seed=seedBatch===0?caseId:caseId+'_SEED_'+seedBatch;
    const input:CombatInput={seed,players,enemies:[fixtures[0].input.enemies[0]],
      maxDurationMs:reviewWindowMs,tickMs:100};

    const roster:ReadyRosterMember[]=ids.map((classId,i)=>({
      accountId:traitPorts[i].accountId,characterId:runtime[i].characterId,
      ticketId:'TICKET_'+caseId+'_'+i,role:CLASS_ROLES_V2[classId],
      originalEnqueuedAtMs:1,loadoutId:'LOADOUT_'+caseId+'_'+i,
      loadoutRevision:1,loadoutSnapshotHash:
        (i.toString(16)+cases.toString(16)).padEnd(64,String(i)),
    }));
    const readyCheck:ReadyCheckRecord={id:'READY_'+cases,partyId:'PARTY_'+cases,
      rosterRevision:1,roster,
      accepts:Object.fromEntries(roster.map(r=>[r.accountId,true])),
      status:'committed',openedAtMs:1,closesAtMs:1000};
    const frozenRoster=ids.map((classId,i)=>({
      accountId:roster[i].accountId,characterId:roster[i].characterId,classId,
      loadoutId:roster[i].loadoutId,revision:1,
      snapshotHash:roster[i].loadoutSnapshotHash,
      readiness:{role:CLASS_ROLES_V2[classId]},
    } as unknown as FrozenLoadoutSnapshot));

    const candidate=preparePartyEnemyKitsV2(input.enemies,{
      ruleset:ENEMY_V2_RULESET,serverSeed:input.seed,
      encounterId:'RUN_'+cases+':NODE_'+boss.id,region:boss.region,equipmentTier:boss.tier,eliteEnemyIds:[],
    });
    const snapshot:PersistedEnemyKitV2={...candidate,source:'server-persisted-v2',revision:1};
    const party:TrustedPersistedPartyExecutionV2={
      runId:'RUN_'+cases,nodeId:'NODE_'+boss.id,encounterRevision:1,stateRevision:1,
      contentVersion:'content_v2',balanceVersion:'balance_v2',
      readyCheck,frozenRoster,traitPorts,
      enemyKit:{snapshot,verifyPersisted:(_row,digest)=>/^[0-9a-f]{64}$/.test(digest)},
      verifyPersisted:(binding,sources,digest)=>
        binding.combatInputDigest===digest&&binding.partyId===readyCheck.partyId&&
        binding.rosterRevision===readyCheck.rosterRevision&&sources.length===4,
    };

    const base=simulateUnifiedEquipmentPersistedPartyCombatV2(
      input,builds,runtime,party,true,false,'tactical',rngReviewPolicy);
    // Personal calibration uses only the synchronized-OFF baseline. Reuse
    // actual engine results rather than adding another expensive simulation.
    for(const [i,classId] of ids.entries()){
      const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
      roleObservations.push(observeRoleCalibrationV2(base.combat,{
        caseId,bossId:boss.id,classId,specializationId:spec.id,actorId:players[i].id,
      }));
    }
    const sync=simulateUnifiedEquipmentPersistedPartyCombatV2(
      input,builds,runtime,party,true,true,'tactical',rngReviewPolicy);
    assert.deepEqual(sync,simulateUnifiedEquipmentPersistedPartyCombatV2(
      input,builds,runtime,party,true,true,'tactical',rngReviewPolicy),'deterministic synchronized persisted party');
    assert.deepEqual(base.equipmentEvidence,sync.equipmentEvidence);
    assert.deepEqual(base.combat.players.map(p=>p.definition.stats),
      sync.combat.players.map(p=>p.definition.stats));
    assert.equal(base.partyPersistenceReview?.binding.combatInputDigest,
      sync.partyPersistenceReview?.binding.combatInputDigest);
    assert.equal(base.synchronizationReview?.active.length,
      sync.synchronizationReview?.active.length);
    assert.ok(sync.enemyMechanicLabels.length>0);
    assert.ok(sync.combat.events.some(e=>e.type==='equipment_trait_trigger'));

    const links=sync.synchronizationReview?.active.length??0;
    maxLinks=Math.max(maxLinks,links);
    for(const link of sync.synchronizationReview?.active??[])
      pairCounts.set(link.id,(pairCounts.get(link.id)??0)+1);
    if(links===0)assert.deepEqual(base.combat,sync.combat,
      'zero-link party must be combat-identical when Synchronization is toggled');

    const damageRatio=pct(partyDamage(sync.combat),partyDamage(base.combat));
    const healingRatio=pct(partyHealing(sync.combat),partyHealing(base.combat));
    // Damage totals saturate at enemy HP when both arms win. Report speed
    // separately rather than incorrectly treating equal totals as equal power.
    if(base.combat.victory&&sync.combat.victory){
      const ratio=base.combat.durationMs/sync.combat.durationMs;
      assert.ok(Number.isFinite(ratio)&&ratio>0);
      matchedVictoryTempoRatios.push(ratio);
      if(ratio<.85||ratio>1.5)tempoOutliers.push({caseId,ratio});
    }
    // Retain identical bounds. Defer only numerical gates until all 432
    // cases are measured, so the first outlier cannot hide later failures.
    const badDamage=isDamageOutlier(damageRatio),badHealing=isHealingOutlier(healingRatio);
    if(badDamage)balanceViolations.push({caseId,metric:'damage',ratio:damageRatio});
    if(badHealing)balanceViolations.push({caseId,metric:'healing',ratio:healingRatio});
    if(reviewWindowMs===9000&&(badDamage||badHealing||caseId==='PERSIST_SYNC_1_BOSS_EXP_BELLBEAST_BASTION_RAVAGER_KNIFE_DANCER_STONECALLER')){
      const extended={...input,maxDurationMs:30000};
      const longBase=simulateUnifiedEquipmentPersistedPartyCombatV2(extended,builds,runtime,party,true,false,'tactical',rngReviewPolicy);
      const longSync=simulateUnifiedEquipmentPersistedPartyCombatV2(extended,builds,runtime,party,true,true,'tactical',rngReviewPolicy);
      console.log('PERSISTED_SYNC_OUTLIER '+JSON.stringify({rngEvidencePolicy,seedBatch,seed:input.seed,caseId,classes:ids,specIndex,boss:boss.id,
       damageRatio,healingRatio,links:sync.synchronizationReview?.active,
       originalWindowMs:input.maxDurationMs,extendedWindowMs:extended.maxDurationMs,
       original:diagnose(base.combat,sync.combat),
       extended:{damageRatio:pct(partyDamage(longSync.combat),partyDamage(longBase.combat)),
        healingRatio:pct(partyHealing(longSync.combat),partyHealing(longBase.combat)),
        ...diagnose(longBase.combat,longSync.combat)}}));
    }

    const linkRow=byLinks.get(links)??bucket();add(linkRow,base.combat,sync.combat,damageRatio,healingRatio);
    byLinks.set(links,linkRow);
    const bossRow=byBoss.get(boss.id)??bucket();add(bossRow,base.combat,sync.combat,damageRatio,healingRatio);
    byBoss.set(boss.id,bossRow);
    add(overall,base.combat,sync.combat,damageRatio,healingRatio);
    cases++;
   }

assert.equal(cases,36*6*2);
assert.equal(overall.cases,432);
assert.ok([...byBoss.values()].every(x=>x.cases===72));
assert.ok(maxLinks<=6);
// Victory-loss fence remains mandatory below, after diagnostic emission.
const authored=listPartySynchronizationsV2();
const dungeonEligible=authored.filter(link=>{
 const roles=link.classes.map(c=>CLASS_ROLES_V2[c]);
 return roles[0]!==roles[1]||roles[0]==='damage';
});
for(const link of dungeonEligible)
 assert.ok((pairCounts.get(link.id)??0)>0,'dungeon-eligible pair missing: '+link.id);
const absentPairs=authored.filter(link=>(pairCounts.get(link.id)??0)===0).map(link=>link.id);

const summarize=(x:Bucket)=>({
 cases:x.cases,
 avgDamageRatio:Number((x.sumDamageRatio/x.cases).toFixed(4)),
 minDamageRatio:Number(x.minDamageRatio.toFixed(4)),
 maxDamageRatio:Number(x.maxDamageRatio.toFixed(4)),
 avgHealingRatio:Number((x.sumHealingRatio/x.cases).toFixed(4)),
 damageImproved:x.damageImproved,survivalImproved:x.survivalImproved,
 victoryGains:x.victoryGains,victoryLosses:x.victoryLosses,identical:x.identical,
});
console.log(JSON.stringify({
 kind:'PERSISTED_PARTY_SYNC_FULL_TUNING_EVIDENCE_NOT_RELEASE_APPROVAL',
 rngEvidencePolicy,seedBatch,reviewWindowMs,matchedPairs:cases,standardDungeonCompositions:36,bosses:6,specializationBands:2,
 maxLinks,overall:summarize(overall),
 byLinks:Object.fromEntries([...byLinks.entries()].sort(([a],[b])=>a-b)
  .map(([links,row])=>[String(links),summarize(row)])),
 byBoss:Object.fromEntries([...byBoss.entries()].sort(([a],[b])=>a.localeCompare(b))
  .map(([id,row])=>[id,summarize(row)])),
 pairCounts:Object.fromEntries([...pairCounts.entries()].sort(([a],[b])=>a.localeCompare(b))),
 absentPairsInStrictDungeonRoleMatrix:absentPairs,
 caveat:'same-build relative uplift; synthetic review gear budgets are not final equal-CP certification',
}));

const roleReport=summarizeRoleCalibrationV2(roleObservations);
assert.equal(roleReport.observations,432*4);
assert.equal(roleReport.cells.length,18*6);
assert.ok(roleReport.cells.every(x=>x.peerClassSpecs===(x.role==='tank'?6:x.role==='damage'?8:4)));
assert.equal(roleReport.cells.reduce((n,x)=>n+x.cases,0),1728);
assert.equal(roleReport.cpApproved,false);
assert.deepEqual(roleReport,summarizeRoleCalibrationV2([...roleObservations].reverse()));
assert.throws(()=>summarizeRoleCalibrationV2([...roleObservations,roleObservations[0]]),/duplicate_or_invalid_observation/);
console.log('ROLE_POWER_CALIBRATION_NOT_CP '+JSON.stringify(roleReport));

console.log('PERSISTED_SYNC_TEMPO_EVIDENCE '+JSON.stringify({rngEvidencePolicy,seedBatch,reviewWindowMs,bothWin:matchedVictoryTempoRatios.length,mean:matchedVictoryTempoRatios.length?matchedVictoryTempoRatios.reduce((a,b)=>a+b,0)/matchedVictoryTempoRatios.length:null,min:matchedVictoryTempoRatios.length?Math.min(...matchedVictoryTempoRatios):null,max:matchedVictoryTempoRatios.length?Math.max(...matchedVictoryTempoRatios):null,tempoOutliers,releaseApproved:false}));
console.log('PERSISTED_SYNC_BALANCE_FENCES '+JSON.stringify({rngEvidencePolicy,seedBatch,damage:[.85,1.50],healing:[.80,1.60],violations:balanceViolations,victoryLosses:overall.victoryLosses}));
assert.equal(overall.victoryLosses,0,'Synchronization must not turn a matched baseline victory into a loss in this fixture');
assert.equal(balanceViolations.length,0,'persisted Synchronization numerical outliers: '+JSON.stringify(balanceViolations));
