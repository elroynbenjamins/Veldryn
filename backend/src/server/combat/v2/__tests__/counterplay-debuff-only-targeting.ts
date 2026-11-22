/**
 * Hidden Combat 2.0 regression: debuff-only status is worth cleansing.
 *
 * The unchanged legacy 'ally_below_50_or_dot' AI must not automatically
 * cleanse a healthy debuffed ally. The authenticated V2 actor's AI must both
 * activate and prioritize the afflicted ally even when another ally has less
 * HP. Uses low-level deterministic engine fixtures, not a live service.
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatantDefinition,CombatInput} from '../../types';

const stats={
 maxHp:2500,attackPower:50,healingPower:60,defense:90,accuracy:1300,
 evasion:100,critChance:0,critMultiplier:1.5,haste:0,
};
function support(useV2:boolean):CombatantDefinition{
 return {
  id:'QA_SUPPORT',name:'QA healer',team:'players',role:'support',level:25,
  stats:{...stats},basicAttackMs:100000,basicAttackCoeff:0,
  ...(useV2?{combatV2:{version:2 as const,resource:'radiance' as const,
    specializationId:'QA_CURE_TARGETING'}}:{}),
  abilities:[{
   id:'QA_TARGETED_CLEANSE',name:'Cleanse Debuff',priority:150,
   cooldownMs:10000,castTimeMs:0,target:'lowest_hp_ally_with_dot',
   aiCondition:'ally_below_50_or_dot',effects:[{kind:'cleanse'}],
  }],
 };
}
const tank:CombatantDefinition={
 id:'QA_TANK',name:'QA tank',role:'tank',team:'players',level:25,
 stats:{...stats,maxHp:4000},basicAttackMs:100000,basicAttackCoeff:0,abilities:[],
};
const curse:CombatantDefinition={
 id:'QA_DEBUFF_ONLY',name:'QA weakening boss',team:'enemies',role:'enemy',level:25,
 stats:{...stats,maxHp:1e6},basicAttackMs:100000,basicAttackCoeff:0,
 abilities:[{
  id:'QA_WEAKEN_TANK',name:'Withering curse',cooldownMs:10000,
  castTimeMs:0,priority:130,target:'current_target',
  effects:[{kind:'debuff',tag:'damage_done',value:-.22,durationMs:3500}],
 }],
};
function fight(useV2:boolean){
 const input:CombatInput={
  seed:'QA_DEBUFF_ONLY_V2_AI',players:[tank,support(useV2)],enemies:[curse],
  initialPlayerState:{QA_SUPPORT:{hp:1900,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0}},
  maxDurationMs:500,
 };
 const before=JSON.stringify(input);
 const result=simulateCombat(input);
 assert.deepEqual(simulateCombat(input),result,'replay must be deterministic');
 assert.equal(JSON.stringify(input),before,'input remains unchanged');
 const cursed=result.events.filter(e=>e.type==='status_apply'&&
  e.abilityId==='QA_WEAKEN_TANK');
 assert.equal(cursed.length,1,'server boss must first debuff the tank');
 assert.equal(cursed[0].targetId,'QA_TANK');
 return result;
}
const upgraded=fight(true),legacy=fight(false);
const removed=upgraded.events.filter(e=>e.type==='status_remove'&&
 e.abilityId==='QA_TARGETED_CLEANSE');
assert.equal(removed.length,1,'a debuff-only condition must trigger exactly one V2 cleanse');
assert.equal(removed[0].statusKind,'debuff');
assert.equal(removed[0].targetId,'QA_TANK','prioritize the afflicted tank over a lower-HP clean support');
assert.ok(!upgraded.players.find(p=>p.definition.id==='QA_TANK')!.modifiers
 .some(m=>m.kind==='debuff'));
assert.equal(legacy.events.filter(e=>e.abilityId==='QA_TARGETED_CLEANSE').length,0,
 'legacy AI cannot wake on a debuff-only condition');
assert.ok(legacy.players.find(p=>p.definition.id==='QA_TANK')!.modifiers
 .some(m=>m.kind==='debuff'),'legacy status remains untouched');
console.log('PASS: V2 debuff-only cleanse AI and targeting; lower-HP clean ally ignored; V1 replay parity');
