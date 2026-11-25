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
import {launchPlayer} from '../../content/launch-combat';
import {SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from '../skill-effects';
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
// Actual server-compiled Stonecaller Cleansing Stream (second River Stone
// variant) must cure a debuff-only high-HP tank. Normal River Stone cannot;
// no made-up skill metadata or live build route is involved.
const stonecaller=launchPlayer('Stonecaller',25);
const river=SKILL_IDENTITIES_V2.find(s=>s.classId==='STONECALLER'&&s.name==='River Stone');
const stoneSpec=SPECIALIZATIONS_V2.find(s=>s.classId==='STONECALLER');
function stoneBuild(index:0|1):VerifiedSkillBuildV2{
 if(!river||!stoneSpec)throw Error('missing_stonecaller_research_skill_or_specialization');
 return {
  actor:stonecaller,verified:{classId:'STONECALLER',level:25,ownedInstanceIds:new Set()},
  selected:{specializationId:stoneSpec.id,equipment:{},
   activeSkills:[{skillId:river.id,variantId:river.variants[index].id}],
   talentRanks:{},signaturePassiveIds:[],capstoneId:null},
  ownedItemsById:{},setsById:{},
 };
}
const ordinary=compileServerSkillBuildV2(true,stoneBuild(0));
const cleansing=compileServerSkillBuildV2(true,stoneBuild(1));
assert.equal(ordinary.abilities[0].aiCondition,'ally_below_50');
assert.equal(ordinary.abilities[0].target,'lowest_hp_ally');
assert.equal(cleansing.abilities[0].aiCondition,'ally_below_50_or_dot');
assert.equal(cleansing.abilities[0].target,'lowest_hp_ally_with_dot');
assert.deepEqual(ordinary.stats,cleansing.stats,'variant does not change class stat budget');
function supportFight(actor:CombatantDefinition){
 const input:CombatInput={seed:'QA_AUTHORED_SUPPORT_CLEANSE',
  players:[tank,actor],enemies:[curse],maxDurationMs:500};
 const result=simulateCombat(input);
 assert.deepEqual(simulateCombat(input),result);
 return result;
}
const ordinaryFight=supportFight(ordinary),cleansingFight=supportFight(cleansing);
assert.equal(ordinaryFight.events.filter(e=>e.type==='status_remove'&&
 e.abilityId==='SC_HEAL:v2:0').length,0);
assert.deepEqual(cleansingFight.events.filter(e=>e.type==='status_remove'&&
 e.abilityId==='SC_HEAL:v2:1').map(e=>[e.targetId,e.statusKind]),
 [['QA_TANK','debuff']], 'real compiled Cleansing Stream removes active debuff');
// Independent Dawnkeeper option (Lv35: Purifying Light unlocks at Lv30).
// This is not an equal-CP cross-class comparison: it only proves another
// real class can execute the same debuff-only counter.
const dawnkeeper=launchPlayer('Dawnkeeper',35);
const purifying=SKILL_IDENTITIES_V2.find(s=>s.classId==='DAWNKEEPER'&&s.name==='Purifying Light');
const dawnSpec=SPECIALIZATIONS_V2.find(s=>s.classId==='DAWNKEEPER');
if(!purifying||!dawnSpec)throw Error('missing_dawnkeeper_purifying_light_or_specialization');
const dawnBuild:VerifiedSkillBuildV2={
 actor:dawnkeeper,verified:{classId:'DAWNKEEPER',level:35,ownedInstanceIds:new Set()},
 selected:{specializationId:dawnSpec.id,equipment:{},
  activeSkills:[{skillId:purifying.id,variantId:purifying.variants[0].id}],
  talentRanks:{},signaturePassiveIds:[],capstoneId:null},
 ownedItemsById:{},setsById:{},
};
const dawnCompiled=compileServerSkillBuildV2(true,dawnBuild);
assert.equal(dawnCompiled.abilities[0].target,'lowest_hp_ally_with_dot');
assert.equal(dawnCompiled.abilities[0].aiCondition,'ally_below_50_or_dot');
const dawnFight=supportFight(dawnCompiled);
assert.deepEqual(dawnFight.events.filter(e=>e.type==='status_remove'&&
 e.abilityId===dawnCompiled.abilities[0].id).map(e=>[e.targetId,e.statusKind]),
 [['QA_TANK','debuff']], 'Dawnkeeper alternative must cleanse the same debuff-only boss');
console.log('PASS: V2 debuff-only cleanse AI and targeting; lower-HP clean ally ignored; V1 replay parity; two independent authored Support cleanses verified');
