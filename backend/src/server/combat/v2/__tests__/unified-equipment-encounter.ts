import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import type {CombatStats} from '../../types';
import {compileServerSkillBuildV2,simulateCombatWithSkillsV2,type VerifiedSkillBuildV2} from '../skill-effects';
import {SKILL_IDENTITIES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {TIERED_SETS_BY_ID_V2} from '../set-catalog';
import {simulateUnifiedEquipmentCombatV2,type TrustedEquipmentRuntimeV2} from '../unified-equipment-encounter';
import {resolveVerifiedEquipmentBaseV2} from '../equipment-base-stats';
import {applyVerifiedSetBonusesV2} from '../equipment-set-effects';
import {compileTrustedEquipmentAffixesV2} from '../equipment-affixes';
import {validateBuildV2} from '../build-contract';
import {evaluatePowerCompositionV2} from '../power-composition';
import {serverBuildCatalogV2} from '../skill-catalog';
import type {ApprovedEquipmentBasePolicyV2} from '../equipment-base-stats';
import type {ApprovedSetPolicyV2} from '../equipment-set-effects';
import type {ServerAffixPolicyV2} from '../equipment-affixes';

const keys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(keys.map(k=>[k,1e8])) as Record<keyof CombatStats,number>;
const basePolicy:ApprovedEquipmentBasePolicyV2={
 rarityMultipliers:{common:1.1},
 qualityMultiplier:quality=>quality===80?1.05:NaN,
 ceilings,
};
const setPolicy:ApprovedSetPolicyV2={
 effectsByThreshold:{'eq2_t1_oathplate:2':[{stat:'defense',mode:'relative',value:.02}]},
 ceilings,
};
const affixLimits=Object.fromEntries([
 'attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp','crit_damage_pct',
 'accuracy_pp','evasion_pp','penetration_pp','ward_pp','shield_strength_pct',
 'class_healing_pct','hex_potency_pct',
].map(x=>[x,{min:.01,max:.10}]));
const affixPolicy:ServerAffixPolicyV2={
 limits:affixLimits as ServerAffixPolicyV2['limits'],
 countsByTierRarity:{'T1:common':2},
 maxFinalHaste:10,maxFinalCritChance:10,maxFinalCritMultiplier:10,
};
const actor=launchPlayer('Ironwarden',25);
const classActor=actor;
const first=SKILL_IDENTITIES_V2.filter(s=>s.classId==='IRONWARDEN').slice(0,2);
const spec=SPECIALIZATIONS_V2.find(s=>s.classId==='IRONWARDEN')!;
const build:VerifiedSkillBuildV2={
 actor:classActor,verified:{classId:'IRONWARDEN',level:25,ownedInstanceIds:new Set(['h','c'])},
 selected:{
  specializationId:spec.id,
  activeSkills:first.map(s=>({skillId:s.id,variantId:s.variants[0].id})),
  equipment:{helmet:'h',chest:'c'},
  talentRanks:{},signaturePassiveIds:[],capstoneId:null,
 },
 ownedItemsById:{
  h:{instanceId:'h',slot:'helmet',eligibleRoles:['tank'],setFamilyId:'eq2_t1_oathplate',tier:'T1',requiredLevel:1},
  c:{instanceId:'c',slot:'chest',eligibleRoles:['tank'],setFamilyId:'eq2_t1_oathplate',tier:'T1',requiredLevel:1},
 },setsById:TIERED_SETS_BY_ID_V2,
};
const fixtureClassStats={...actor.stats};
const runtime:TrustedEquipmentRuntimeV2={
 actorId:classActor.id,characterId:'CHAR_1',
 // Approved stats are a separate server-only fixture, not the combat input.
 classBaselinePolicy:{version:'synthetic-class-profile-v1',profiles:{
  IRONWARDEN:{classId:'IRONWARDEN',minLevel:1,maxLevel:75,
   statsAtLevel:()=>({...fixtureClassStats}),
   basicAttackMs:actor.basicAttackMs,basicAttackCoeff:actor.basicAttackCoeff,
   abilities:actor.abilities},
 }},
 instancesById:{
  h:{id:'h',itemId:'oath_helm',ownerCharacterId:'CHAR_1',tier:'T1',rarity:'common',quality:80},
  c:{id:'c',itemId:'oath_chest',ownerCharacterId:'CHAR_1',tier:'T1',rarity:'common',quality:80},
 },
 definitionsByItemId:{
  oath_helm:{itemId:'oath_helm',tier:'T1',slot:'helmet',primaryStats:{defense:30}},
  oath_chest:{itemId:'oath_chest',tier:'T1',slot:'chest',primaryStats:{defense:10,maxHp:120}},
 },
 affixesByInstanceId:{
  h:{instanceId:'h',slot:'helmet',tier:'T1',rarity:'common',quality:80,
    affixes:[{id:'defense_pct',value:.03}]},
  c:{instanceId:'c',slot:'chest',tier:'T1',rarity:'common',quality:80,affixes:[]},
 },
 basePolicy,setsPolicy:setPolicy,affixPolicy,
};
const enemy=launchPlayer('Ravager',25);
const foe={
 ...enemy,id:'E',name:'Synthetic enemy',team:'enemies' as const,role:'enemy' as const,
 abilities:[],combatV2:undefined,
 tags:[],
};
const input={seed:'source-owned-equipment-integration',players:[classActor],enemies:[foe],maxDurationMs:8000};
const before=JSON.stringify(classActor);
assert.throws(()=>simulateCombatWithSkillsV2(input,[build],true),
 /equipment_pipeline_required/,'Skills-only simulator must never silently skip equipped gear');
const disabled=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],false);
assert.equal(disabled.equipmentEvidence.length,0);
const enabled=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true);
const repeat=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true);
assert.deepEqual(enabled,repeat,'identical server snapshots must yield identical replays');
assert.equal(enabled.equipmentEvidence.length,1);
const evidence=enabled.equipmentEvidence[0];
assert.equal(evidence.baseSources.length,2);
assert.equal(evidence.setEffects.length,1);
assert.equal(evidence.setEffects[0].thresholdId,'eq2_t1_oathplate:2');
assert.equal(evidence.affixSources.length,1);
assert.equal(evidence.composition,undefined,'No unapproved CP weighting may be assumed');
const weights=Object.fromEntries(keys.map(x=>[x,x==='attackPower'?1:0])) as Record<keyof CombatStats,number>;
const policy={
 targetClassShare:{min:.15,max:.18},weights,requiredEquipmentSlots:10,
};
const syntheticClass={...actor.stats,attackPower:16};
const syntheticFull={...actor.stats,attackPower:100};
const good=evaluatePowerCompositionV2(syntheticClass,syntheticFull,10,policy);
assert.equal(good.classShare,.16);
assert.equal(good.withinTarget,true);
assert.equal(good.otherShare,.84);
assert.equal(evaluatePowerCompositionV2(syntheticClass,syntheticFull,9,policy).withinTarget,null,
 'Partly equipped characters must not be judged against full-gear targets');
assert.equal(evaluatePowerCompositionV2(syntheticClass,
 {...syntheticFull,attackPower:200},10,policy).withinTarget,false);
assert.throws(()=>evaluatePowerCompositionV2(syntheticClass,syntheticFull,10,{
 ...policy,weights:{...weights,critChance:NaN},
}),/missing_approved_cp_weight/);

assert.equal(JSON.stringify(classActor),before,'base actor must not be mutated');
const resolved=enabled.combat.players[0].definition;
const rarityQuality=1.1*1.05;
const round6=(n:number)=>Math.round(n*1e6)/1e6;
const round5=(n:number)=>Math.round(n*1e5)/1e5;
const classDefense=compileServerSkillBuildV2(true,build).stats.defense;
const expectedDefenseBase=round6(classDefense+
  round6(30*rarityQuality)+round6(10*rarityQuality));
const expectedWithSet=round6(expectedDefenseBase*1.02);
const expectedWithAffix=round5(expectedWithSet*1.03);
// Class/spec first, then quality/rarity, set, and finally the random roll.
assert.equal(resolved.stats.defense,expectedWithAffix);

assert.ok(resolved.tags?.includes('combat-v2-class-base-only'));
assert.notEqual(resolved.stats,actor.stats,'Output must use a separately issued stat object');
assert.ok(resolved.tags?.includes('combat-v2-gear-base-resolved'));
assert.ok(resolved.tags?.includes('combat-v2-sets-applied'));
assert.ok(resolved.tags?.includes('combat-v2-affixes-applied'));
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,instancesById:{...runtime.instancesById,
   h:{...runtime.instancesById.h,ownerCharacterId:'BANK'}}},
],true),/snapshot|not_owned/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,affixesByInstanceId:{
  ...runtime.affixesByInstanceId,h:{...runtime.affixesByInstanceId.h,quality:77},
 }},
],true),/missing_authoritative_equipment_snapshot/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,definitionsByItemId:{...runtime.definitionsByItemId,
  oath_chest:{...runtime.definitionsByItemId.oath_chest,
    primaryStats:{maxHp:1,defense:1,attackPower:1}}},
 },
],true),/one_or_two_positive_base_stats/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,setsPolicy:{effectsByThreshold:{},ceilings}},
],true),/set_effect_unimplemented/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,basePolicy:{...basePolicy,rarityMultipliers:{}}},
],true),/missing_approved_rarity_quality_multiplier/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,affixesByInstanceId:{...runtime.affixesByInstanceId,
  banked:{...runtime.affixesByInstanceId.h,instanceId:'banked'},
 }},
],true),/extra_equipment_affix_snapshot/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,basePolicy:{...basePolicy,ceilings:{...ceilings,defense:1}}},
],true),/base_equipment_exceeds_approved_stat_ceiling/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,setsPolicy:{...setPolicy,ceilings:{...ceilings,defense:1}}},
],true),/set_exceeds_approved_stat_ceiling/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[
 {...runtime,affixPolicy:{...affixPolicy,maxFinalCritChance:0}},
],true),/affix_exceeds_approved_stat_caps/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[],true),/complete_build_and_gear_snapshots_required/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build,build],[runtime],true),/complete_build_and_gear_snapshots_required/);
console.log('PASS: strict server gear ordering, provenance, no legacy double-counting, deterministic replays');
