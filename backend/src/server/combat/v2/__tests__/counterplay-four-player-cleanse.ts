/**
 * Isolated 4-player engine review: Combat 2.0 cleanse is source-scoped,
 * multi-ally, deterministic and nonrecursive. This is NOT the persisted
 * Dungeon/Party 2.0 adapter or a production roster/gear receipt test.
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {AbilityDefinition,CombatInput,CombatantDefinition,CombatV2Resource} from '../../types';

const stats={
 maxHp:2800,attackPower:120,healingPower:70,defense:80,accuracy:1100,
 evasion:90,critChance:0,critMultiplier:1.5,haste:0,
};
type TeamRole='tank'|'damage'|'support';
function ally(id:string,role:TeamRole,resource:CombatV2Resource,
 abilities:AbilityDefinition[]=[]):CombatantDefinition{
 return {
  id,name:id,role,team:'players',level:35,
  stats:{...stats},basicAttackMs:1800,basicAttackCoeff:.4,
  combatV2:{version:2,resource,specializationId:'QA_4_PLAYER_PARTY'},
  abilities,
 };
}
function roster(mode:'counter'|'alternative'):CombatantDefinition[]{
 const supportAbility:AbilityDefinition=mode==='counter'?{
  id:'QA_PARTY_CLEANSE',name:'Party Cleanse',priority:120,
  cooldownMs:9000,castTimeMs:0,target:'all_allies',
  aiCondition:'ally_below_50_or_dot',effects:[{kind:'cleanse'}],
 }:{
  id:'QA_PARTY_SHIELD',name:'Alternative Party Shield',priority:120,
  cooldownMs:9000,castTimeMs:0,target:'all_allies',
  effects:[{kind:'shield',flat:35}],
 };
 return [
  ally('QA_TANK','tank','guard'),
  ally('QA_DAMAGE_A','damage','focus'),
  ally('QA_DAMAGE_B','damage','rhythm'),
  ally('QA_SUPPORT','support','radiance',[supportAbility]),
 ];
}
const boss:CombatantDefinition={
 id:'QA_PARTY_CURSE',name:'Synthetic party pressure',team:'enemies',
 role:'enemy',boss:true,level:35,
 stats:{...stats,maxHp:1e6,attackPower:140},basicAttackMs:100000,
 basicAttackCoeff:0,abilities:[{
  id:'QA_ALLY_HEX',name:'Party Hex',cooldownMs:20000,
  priority:150,castTimeMs:0,target:'all_enemies',
  effects:[
   {kind:'debuff',tag:'damage_done',value:-.24,durationMs:5000},
   {kind:'dot',tag:'frost',damageType:'ice',coeff:.42,tickMs:1000,durationMs:5000},
  ],
 }],
};
function fight(mode:'counter'|'alternative'){
 const input:CombatInput={seed:'QA_FOUR_PLAYER_CLEANSE',players:roster(mode),
  enemies:[boss],maxDurationMs:4200};
 const original=JSON.stringify(input);
 const result=simulateCombat(input);
 assert.deepEqual(simulateCombat(input),result,'party replay is deterministic');
 assert.equal(JSON.stringify(input),original,'source not mutated');
 assert.ok(result.events.length<5000,'no multialliance recursive effect storm');
 return result;
}
const counter=fight('counter'),alternative=fight('alternative');
assert.equal(counter.players.length,4);
assert.equal(alternative.players.length,4);
assert.deepEqual(roster('counter').map(p=>p.stats),roster('alternative').map(p=>p.stats),
 'the four members must have equal stat budgets across the A/B');
const cures=counter.events.filter(e=>e.type==='status_remove'&&
 e.actorId==='QA_SUPPORT'&&e.abilityId==='QA_PARTY_CLEANSE');
const dotCures=cures.filter(e=>e.statusKind==='dot');
const debuffCures=cures.filter(e=>e.statusKind==='debuff');
assert.equal(dotCures.length,4,'all four allies must be freed from the DoT');
assert.equal(debuffCures.length,4,'all four allies must be freed from the weakening debuff');
assert.deepEqual(new Set(dotCures.map(e=>e.targetId)),
 new Set(roster('counter').map(p=>p.id)));
assert.deepEqual(new Set(debuffCures.map(e=>e.targetId)),
 new Set(roster('counter').map(p=>p.id)));
assert.ok(counter.players.every(p=>p.modifiers.every(m=>m.kind!=='debuff')),
 'no harmful modifier persists on a cleansed ally');
assert.ok(alternative.events.some(e=>e.type==='shield'&&
 e.actorId==='QA_SUPPORT'&&e.abilityId==='QA_PARTY_SHIELD'),
 'the shield alternative remains a real defensive action');
assert.ok(alternative.events.some(e=>e.type==='dot_tick'&&
 roster('alternative').some(p=>p.id===e.targetId)),
 'the noncleanse team genuinely faces periodic pressure');
assert.equal(counter.events.filter(e=>e.type==='status_remove'&&
 e.actorId==='QA_SUPPORT').length,8,'no repeated/empty cleanse farming');
console.log('PASS: 4-player Combat 2.0 engine alternative, 8 source-attributed cures, deterministic replays; NO persisted party/dungeon activation');
