/**
 * Hidden, measured equal-STAT-budget Combat 2.0 counterplay experiments.
 * Uses the real deterministic engine and its event stream. This does not
 * invent a production Combat Power formula, item receipt or final balance.
 *
 * Both compared players have IDENTICAL base stats, attack cadence, class and
 * resource. Only one tactical skill slot differs (offense vs counter).
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import {prepareAsterfallBossV2} from '../../boss-v2-asterfall-prototype';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import type {CombatantDefinition,CombatInput,CombatResult,AbilityDefinition} from '../../types';

const stats={
 maxHp:2500,attackPower:180,healingPower:90,defense:75,accuracy:1200,
 evasion:90,critChance:0,critMultiplier:1.5,haste:0,
};
function player(tactic:'generic'|'counter',kind:'curse'|'interrupt'):CombatantDefinition{
 const offense:AbilityDefinition={
  id:'QA_OFFENSIVE_SLOT',name:'Offensive Slot',cooldownMs:1800,
  castTimeMs:0,priority:150,target:'current_target',
  effects:[{kind:'damage',coeff:.35,damageType:'physical'}],
 };
 const counter:AbilityDefinition=kind==='curse'?{
  id:'QA_CLEANSE_SLOT',name:'Curse Counter',cooldownMs:2000,
  castTimeMs:0,priority:150,target:'self',aiCondition:'ally_below_50_or_dot',
  effects:[{kind:'cleanse'}],
 }:{
  id:'QA_INTERRUPT_SLOT',name:'Cast Counter',cooldownMs:1800,
  castTimeMs:0,priority:150,target:'interruptible_casting_enemy',
  aiCondition:'target_casting',effects:[{kind:'interrupt'}],
 };
 return {
  id:'QA_PLAYER',name:'Equal-budget support',team:'players',
  role:'support',level:35,stats:{...stats},
  basicAttackMs:1700,basicAttackCoeff:.7,
  combatV2:{version:2,resource:'radiance',specializationId:'QA_EQUAL_STAT_BUDGET'},
  abilities:[tactic==='counter'?counter:offense],
 };
}
const curseEnemy:CombatantDefinition={
 id:'QA_CURSE',name:'Equal-budget curse opponent',team:'enemies',
 role:'enemy',level:35,
 stats:{...stats,maxHp:100000,attackPower:180},basicAttackMs:1900,basicAttackCoeff:.1,
 abilities:[{
  id:'QA_FIRE_CURSE',name:'Fire Curse',priority:130,cooldownMs:30000,
  castTimeMs:0,target:'current_target',effects:[
   {kind:'debuff',tag:'damage_done',value:-.35,durationMs:8000},
   {kind:'dot',coeff:.32,tag:'burn',damageType:'fire',durationMs:8000,tickMs:1000},
  ],
 }],
};
const rootBase:CombatantDefinition={
 ...curseEnemy,id:'BOSS_EXP_ROOT',name:'Asterfall Root',boss:true,
 abilities:[],phases:[],tags:[],
};
const root=prepareAsterfallBossV2(rootBase,ENEMY_V2_RULESET);
assert.ok(root.abilities.some(a=>a.id==='ROOT_V2_LIVING_BARK'&&
 a.interruptible&&a.castTimeMs>=1200));
function replay(seed:string,kind:'curse'|'interrupt',tactic:'generic'|'counter'):CombatResult{
 const actor=player(tactic,kind),opponent=kind==='curse'?curseEnemy:root;
 const input:CombatInput={seed,players:[actor],enemies:[opponent],
  maxDurationMs:kind==='curse'?6000:3000};
 const before=JSON.stringify(input);
 const result=simulateCombat(input);
 assert.deepEqual(simulateCombat(input),result,'engine replay must be bitwise stable');
 assert.equal(JSON.stringify(input),before,'source snapshots must be immutable');
 assert.ok(result.events.length<5000,'no recursion/proc storm');
 return result;
}
let pairedRuns=0;
for(const seed of ['QA_COUNTERPLAY_SEED_1','QA_COUNTERPLAY_SEED_2','QA_COUNTERPLAY_SEED_3']){
 const generic=replay(seed,'curse','generic');
 const counter=replay(seed,'curse','counter');
 assert.ok(counter.events.some(e=>e.type==='status_remove'&&
  e.actorId==='QA_PLAYER'&&e.statusKind==='debuff'),'curse counter removes hostile debuff');
 assert.ok(counter.events.some(e=>e.type==='status_remove'&&
  e.actorId==='QA_PLAYER'&&e.statusKind==='dot'),'curse counter removes hostile DoT');
 assert.ok(generic.events.some(e=>e.type==='dot_tick'&&e.targetId==='QA_PLAYER'),
  'offensive alternative must actually endure the DoT');
 assert.ok(counter.players[0].hp>generic.players[0].hp,
  'same-stat counter build should preserve more HP against DoT opponent');
 const sameStats=JSON.stringify(player('counter','curse').stats)===
  JSON.stringify(player('generic','curse').stats);
 assert.ok(sameStats,'QA cannot claim equal budget when stats differ');
 pairedRuns++;
 const defensive=replay(seed,'interrupt','counter');
 const offensive=replay(seed,'interrupt','generic');
 assert.ok(defensive.events.some(e=>e.type==='interrupt'&&
  e.actorId==='QA_PLAYER'&&e.interruptedAbilityId==='ROOT_V2_LIVING_BARK'),
  'tactical interrupt must stop authored Living Bark cast');
 assert.ok(!defensive.events.some(e=>e.type==='shield'&&
  e.abilityId==='ROOT_V2_LIVING_BARK'),
  'interrupted cast must not grant its shield');
 assert.ok(offensive.events.some(e=>e.type==='cast_complete'&&
  e.abilityId==='ROOT_V2_LIVING_BARK'),
  'offensive alternative must actually permit that cast');
 assert.ok(offensive.events.some(e=>e.type==='shield'&&
  e.abilityId==='ROOT_V2_LIVING_BARK'),
  'uninterrupted cast must still produce boss shield');
 assert.deepEqual(player('counter','interrupt').stats,player('generic','interrupt').stats);
 pairedRuns++;
}
assert.equal(pairedRuns,6);
console.log('PASS: 6 measured equal-STAT-budget tactical pairs, real status/interrupt events, deterministic replay; NOT a verified equal-CP or final win-rate claim');
