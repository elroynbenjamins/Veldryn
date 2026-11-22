/**
 * Hidden boss presentation-contract regression, without a mobile UI change.
 * All reported telegraphs and cleanses must be replays of actual engine
 * events from an authored Boss 2.0 kit, not predictions or fake text.
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import {prepareAsterfallBossV2} from '../../boss-v2-asterfall-prototype';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import type {CombatantDefinition,CombatInput,CombatResult} from '../../types';
import {projectBossCombatReplaySignalsV2} from '../boss-telegraph-projection';

const stats={maxHp:3000,attackPower:60,healingPower:40,defense:90,
 accuracy:1300,evasion:50,critChance:0,critMultiplier:1.5,haste:0};
function boss(id:'BOSS_EXP_ROOT'|'BOSS_EXP_BELL'):CombatantDefinition{
 const base:CombatantDefinition={id,name:id,boss:true,team:'enemies',role:'enemy',level:35,
  stats:{...stats,maxHp:100000,attackPower:150},basicAttackMs:100000,
  basicAttackCoeff:0,abilities:[],phases:[],tags:[]};
 const prepared=prepareAsterfallBossV2(base,ENEMY_V2_RULESET);
 assert.notEqual(prepared,base,'real authored 2.0 kit must be selected');
 return prepared;
}
function player(kind:'generic'|'interrupt'|'cleanse'):CombatantDefinition{
 const ability=kind==='interrupt'?{
   id:'QA_STOP_CAST',name:'Cast response',target:'interruptible_casting_enemy' as const,
   priority:140,castTimeMs:0,cooldownMs:9000,
   aiCondition:'target_casting' as const,effects:[{kind:'interrupt' as const}],
  }:kind==='cleanse'?{
   id:'QA_CURE_CURSE',name:'Debuff response',target:'self' as const,
   priority:140,castTimeMs:0,cooldownMs:9000,
   aiCondition:'ally_below_50_or_dot' as const,effects:[{kind:'cleanse' as const}],
  }:null;
 return {id:'QA_PLAYER',name:'QA Player',team:'players',role:'support',level:35,
  stats:{...stats},basicAttackMs:100000,basicAttackCoeff:0,
  combatV2:{version:2,resource:'radiance',specializationId:'QA_BOSS_SIGNAL'},
  abilities:ability?[ability]:[]};
}
function combat(kind:'generic'|'interrupt'|'cleanse',name:'BOSS_EXP_ROOT'|'BOSS_EXP_BELL'){
 const input:CombatInput={seed:'QA_BOSS_SIGNAL_'+name+'_'+kind,
  players:[player(kind)],enemies:[boss(name)],maxDurationMs:3500};
 const result=simulateCombat(input);
 assert.deepEqual(simulateCombat(input),result);
 return result;
}
const rootGeneric=combat('generic','BOSS_EXP_ROOT');
const rootInterrupted=combat('interrupt','BOSS_EXP_ROOT');
const completed=projectBossCombatReplaySignalsV2(rootGeneric);
const cancelled=projectBossCombatReplaySignalsV2(rootInterrupted);
assert.deepEqual(projectBossCombatReplaySignalsV2(rootGeneric),completed);
assert.deepEqual(projectBossCombatReplaySignalsV2(rootInterrupted),cancelled);
assert.equal(completed.casts.length,1);
assert.equal(completed.casts[0].abilityId,'ROOT_V2_LIVING_BARK');
assert.equal(completed.casts[0].abilityName,'Living Bark');
assert.equal(completed.casts[0].castDurationMs,1300);
assert.equal(completed.casts[0].state,'completed');
assert.equal(completed.casts[0].endedAtMs,completed.casts[0].expectedCompleteAtMs);
assert.equal(cancelled.casts.length,1);
assert.equal(cancelled.casts[0].abilityName,'Living Bark');
assert.equal(cancelled.casts[0].state,'interrupted');
assert.equal(cancelled.casts[0].interruptedByActorId,'QA_PLAYER');
assert.ok(cancelled.casts[0].endedAtMs!<cancelled.casts[0].expectedCompleteAtMs);
assert.ok(!rootInterrupted.events.some(e=>e.type==='shield'&&
 e.abilityId==='ROOT_V2_LIVING_BARK'));
const bellCleansed=combat('cleanse','BOSS_EXP_BELL');
const bellSignals=projectBossCombatReplaySignalsV2(bellCleansed);
assert.ok(bellSignals.casts.some(c=>c.abilityId==='BELL_V2_SOUL_CURSE'&&
 c.state==='completed'&&c.castDurationMs===1400));
assert.deepEqual(bellSignals.statusClears.filter(s=>s.actorId==='QA_PLAYER'&&
 s.abilityId==='QA_CURE_CURSE'&&s.statusKind==='debuff')
 .map(s=>[s.targetId,s.statusTag]),
 [['QA_PLAYER','damage_done']], 'actual debuff removal can be projected without inventing a cleanse');
const bogusStart:CombatResult={...rootGeneric,events:[
 {atMs:0,type:'cast_start',actorId:'BOSS_EXP_ROOT',targetId:'QA_PLAYER',
  abilityId:'FAKE_TOOLTIP_BOSS_CAST'},
 ...rootGeneric.events,
]};
assert.throws(()=>projectBossCombatReplaySignalsV2(bogusStart),
 /cast_start_unverifiable/,'unrecognized tooltip casts must be rejected');
const bogusInterrupt:CombatResult={...rootGeneric,events:[
 ...rootGeneric.events.slice(0,-1),
 {atMs:3400,type:'interrupt',actorId:'QA_PLAYER',
  targetId:'BOSS_EXP_ROOT',interruptedAbilityId:'ROOT_V2_LIVING_BARK'},
 rootGeneric.events[rootGeneric.events.length-1],
]};
assert.throws(()=>projectBossCombatReplaySignalsV2(bogusInterrupt),
 /interruption_without_live_cast/,
 'no success/interrupted message can be synthesized after a completed cast');
const nonV2:CombatResult={...rootGeneric,players:rootGeneric.players.map(p=>({
 ...p,definition:{...p.definition,combatV2:undefined},
}))};
assert.throws(()=>projectBossCombatReplaySignalsV2(nonV2),
 /skills_v2_required/,'legacy combat cannot use a hidden V2 boss UI contract');
const nonAuthored:CombatResult={...rootGeneric,enemies:rootGeneric.enemies.map(e=>({
 ...e,definition:{...e.definition,tags:[]},
}))};
assert.throws(()=>projectBossCombatReplaySignalsV2(nonAuthored),
 /boss_unverified_v2_kit/,'unversioned boss cannot masquerade as a V2 cast');
console.log('PASS: authored boss V2 cast-start/finish/interrupt windows, real status-clear messages, spoof rejection, legacy isolation; no UI or live wiring');
