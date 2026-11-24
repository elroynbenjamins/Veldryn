/**
 * Synthetic SIX-boss encounter observability, not a combat difficulty approval.
 * Builds 18 class/spec baselines without final Equipment 2.0 roll budgets.
 * Exercises the actual V2 combat engine, stored enemy kits, class resources,
 * authored boss abilities and replay determinism; NO player data or rewards.
 */
import {strict as assert} from 'node:assert';
import type {CombatantDefinition,CombatInput} from '../../types';
import {launchPlayer,rootboundHeartBoss,bellWardenBoss} from '../../content/launch-combat';
import {simulateCombat} from '../../engine';
import {CLASS_NAMES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import type {ClassIdV2} from '../build-contract';
import {RESOURCE_BY_CLASS_V2,RESOURCE_CAP_V2} from '../resource-runtime';
import {prepareSoloEnemyKitsV2,verifyPersistedEnemyKitsV2,
 type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {issueEnemyV2EngineAuthority,enemyV2SnapshotDigest} from '../enemy-engine-authority';
import {projectPersistedBossCounterplayV2} from '../boss-counterplay-contract';
import {observeBossPacingV2,aggregateBossPacingV2,
 type BossPacingObservationV2} from '../boss-pacing-diagnostics';

const bosses=[
 {id:'BOSS_EXP_ROOT',name:'Rootbound Heart',region:'asterfall',tier:2,level:25},
 {id:'BOSS_EXP_BELL',name:'Bell-Warden',region:'asterfall',tier:2,level:25},
 {id:'BOSS_EXP_SOLAR',name:'The Buried Heliarch',region:'sunscar',tier:3,level:35},
 {id:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',region:'sunscar',tier:3,level:35},
 {id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',region:'frostmarch',tier:5,level:55},
 {id:'BOSS_EXP_CANTOR',name:'The Frozen Cantor',region:'frostmarch',tier:5,level:55},
] as const;
function baselineBoss(config:typeof bosses[number]):CombatantDefinition{
 if(config.id==='BOSS_EXP_ROOT')return rootboundHeartBoss(config.level);
 if(config.id==='BOSS_EXP_BELL')return bellWardenBoss(config.level);
 return {
  id:config.id,name:config.name,team:'enemies',role:'enemy',boss:true,
  level:config.level,basicAttackMs:2800,basicAttackCoeff:.65,
  stats:{maxHp:26000,attackPower:220,healingPower:0,defense:240,
   accuracy:920,evasion:100,critChance:.02,critMultiplier:1.5,haste:0},
  abilities:[],tags:[],phases:[],
 };
}
let attempts=0,staleDenied=0;
const pacingRows:BossPacingObservationV2[]=[];
const summaries:{bossId:string;scenarios:number;castEvents:number;
 completed:number;interrupts:number;phaseEvents:number;
 victories:number;timeouts:number;warnings:string[]}[]=[];
for(const config of bosses){
 let castEvents=0,completed=0,interrupts=0,phaseEvents=0,
 victories=0,timeouts=0;
 const warnings:string[]=[];
 const authoredCastIds=new Set<string>();
 for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
  const specs=SPECIALIZATIONS_V2.filter(s=>s.classId===classId);
  assert.equal(specs.length,2);
  for(const spec of specs){
   // Human-readable launch names (notably Knife Dancer) are not valid
   // server persistence actor IDs. Use an immutable QA-only canonical ID.
   const player={...launchPlayer(CLASS_NAMES_V2[classId],config.level),
    id:'QA_BOSS_PLAYER_'+classId};
   player.combatV2={
    version:2,resource:RESOURCE_BY_CLASS_V2[classId],
    specializationId:spec.id,
   };
   const base=baselineBoss(config);
   assert.equal(base.name,config.name);
   const seed='BOSS_MATRIX_'+config.id+'_'+classId+'_'+spec.id;
   const candidate=prepareSoloEnemyKitsV2([base],{
    ruleset:'enemy-v2-prototype-1',serverSeed:seed,
    encounterId:'QA_'+classId+'_'+config.id+'_'+spec.id,
    region:config.region,equipmentTier:config.tier,eliteEnemyIds:[],
   });
   const stored:PersistedEnemyKitV2={...candidate,
    source:'server-persisted-v2',revision:1};
   const proof=verifyPersistedEnemyKitsV2([base],stored);
   const tells=projectPersistedBossCounterplayV2([base],stored);
   assert.equal(tells.length,1);
   for(const cast of tells[0].casts)authoredCastIds.add(cast.abilityId);
   const input:CombatInput={
    seed,players:[player],enemies:[...proof.enemies],
    maxDurationMs:20000,tickMs:100,
   };
   const digest=enemyV2SnapshotDigest(input);
   const authority=issueEnemyV2EngineAuthority({
    source:'server-persisted-v2',version:2,ruleset:stored.ruleset,
    mode:'solo',encounterId:stored.encounterId,revision:stored.revision,
    seed,playerIds:[player.id],enemyIds:[base.id],bossIds:[base.id],
   },input,(_snapshot,sha)=>sha===digest);
   const a=simulateCombat(input,authority);
   const replay=simulateCombat(input,authority);
   assert.deepEqual(a,replay,'Immutable server seed and compiled snapshot must replay');
   assert.ok(a.events.length<5000,'Unbounded V2 boss effects');
   assert.equal(a.enemies[0].definition.id,base.id);
   assert.ok(a.events.every(e=>Number.isFinite(e.atMs)&&e.atMs>=0));
   assert.ok(a.events.every((e,i)=>i===0||a.events[i-1].atMs<=e.atMs),
    'Boss replay cannot emit backward timestamps');
   assert.ok(Number.isFinite(a.players[0].hp)&&
    Number.isFinite(a.players[0].damageDone)&&
    Number.isFinite(a.players[0].damageTaken));
   assert.ok((a.players[0].combatV2?.stacks??-1)>=0&&
    (a.players[0].combatV2?.stacks??Infinity)<=
     RESOURCE_CAP_V2[RESOURCE_BY_CLASS_V2[classId]]);
   castEvents+=a.events.filter(e=>e.type==='cast_start'&&
    e.actorId===base.id&&authoredCastIds.has(e.abilityId??'')).length;
   completed+=a.events.filter(e=>e.type==='cast_complete'&&
    e.actorId===base.id&&authoredCastIds.has(e.abilityId??'')).length;
   interrupts+=a.events.filter(e=>e.type==='interrupt'&&
    e.targetId===base.id).length;
   phaseEvents+=a.events.filter(e=>e.type==='phase'&&
    e.actorId===base.id).length;
   pacingRows.push(observeBossPacingV2({
    bossId:base.id,classId,specId:spec.id,
    casts:tells[0].casts.map(cast=>({
     abilityId:cast.abilityId,castMs:cast.castMs,
     interruptible:cast.interruptible,
    })),
    phases:tells[0].phases.map(phase=>({
     phaseId:phase.phaseId,hpPercent:phase.hpPercent,
    })),
   },a));
   if(a.victory)victories++;
   if(a.reason==='timeout')timeouts++;
   // Scope hash must reject attacker modifications, including phase timing.
   if(classId==='IRONWARDEN'&&spec===specs[0]){
    const altered={...input,enemies:input.enemies.map(e=>({
      ...e,stats:{...e.stats,attackPower:e.stats.attackPower*1.1},
    }))};
    assert.throws(()=>simulateCombat(altered,authority),
     /scope_does_not_match_combat_input/);
    staleDenied++;
   }
   attempts++;
  }
 }
 // These remain diagnostic warnings until real gear and level curves are approved.
 if(castEvents===0)warnings.push('no authored V2 cast was observed');
 if(completed===0)warnings.push('no authored V2 cast completed');
 if(phaseEvents===0)warnings.push('no phase transition observed in 20s window');
 if(victories===0)warnings.push('no victories in baseline-only window');
 if(victories===18)warnings.push('all baseline fights won; inspect weak boss tuning');
 summaries.push({bossId:config.id,scenarios:18,castEvents,
  completed,interrupts,phaseEvents,victories,timeouts,warnings});
}
assert.equal(attempts,108);
assert.equal(staleDenied,6);
assert.equal(summaries.length,6);
assert.ok(summaries.every(row=>row.scenarios===18));
assert.equal(pacingRows.length,108);
const pacing=aggregateBossPacingV2(pacingRows);
assert.equal(pacing.length,6);
assert.ok(pacing.every(row=>row.cases===18&&row.classSpecCount===18));
assert.deepEqual(aggregateBossPacingV2([...pacingRows].reverse()),pacing,
 'Six-boss pacing summary cannot depend on simulation iteration order');
console.log(JSON.stringify({
 type:'SYNTHETIC_BOSS_PACING_DIAGNOSTIC_NOT_FINAL_BALANCE',
 cases:pacingRows.length,bosses:pacing,
}));

console.log(JSON.stringify({type:'SYNTHETIC_BASELINES_ONLY_NOT_RELEASE_BALANCE',
 attempts,staleDenied,summaries}));
console.log('PASS: 108 deterministic class/spec x six boss encounters; authority replay, boss tells, phase diagnostics, anti-tamper and resource caps');
