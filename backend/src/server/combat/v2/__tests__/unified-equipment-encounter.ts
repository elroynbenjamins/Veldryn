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
import {equipmentQualityMultiplierV2} from '../equipment-scaling-policy';
import {serverBuildCatalogV2} from '../skill-catalog';
import {prepareSoloEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import type {ApprovedEquipmentBasePolicyV2} from '../equipment-base-stats';
import type {ApprovedSetPolicyV2} from '../equipment-set-effects';
import type {ServerAffixPolicyV2} from '../equipment-affixes';

const keys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(keys.map(k=>[k,1e8])) as Record<keyof CombatStats,number>;
const basePolicy:ApprovedEquipmentBasePolicyV2={
 rarityMultipliers:{common:1.1,rare:1.17},
 qualityMultiplier:equipmentQualityMultiplierV2,
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
 rarityPolicy:{version:'synthetic-rarity-test-v1',order:['common','rare'],
  multipliers:{common:1.1,rare:1.17}},
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
const resolved=enabled.combat.players[0].definition;
const repeat=simulateUnifiedEquipmentCombatV2(input,[build],[runtime],true);
assert.deepEqual(enabled,repeat,'identical server snapshots must yield identical replays');
assert.equal(enabled.equipmentEvidence.length,1);
const evidence=enabled.equipmentEvidence[0];
assert.equal(evidence.baseSources.length,2);
assert.equal(evidence.setEffects.length,1);
assert.equal(evidence.setEffects[0].thresholdId,'eq2_t1_oathplate:2');
assert.equal(evidence.affixSources.length,1);
assert.equal(evidence.classPolicyVersion,'synthetic-class-profile-v1');
assert.deepEqual(evidence.statStages.afterAffixes,resolved.stats);
assert.equal(evidence.statStages.afterSkills.defense,
 compileServerSkillBuildV2(true,build).stats.defense);
assert.ok(evidence.statStages.afterItemBase.maxHp>evidence.statStages.afterSkills.maxHp);
assert.equal(evidence.statStages.afterSets.defense,
 Math.round(evidence.statStages.afterItemBase.defense*1.02*1e6)/1e6);
assert.equal(evidence.statStages.classOnly.attackPower,fixtureClassStats.attackPower);

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
const poisonedActor={...classActor,
 stats:{...classActor.stats,attackPower:9999999,defense:9999999},
 abilities:[]};
const poisonedBuild={...build,actor:poisonedActor};
const poisonedReplay=simulateUnifiedEquipmentCombatV2(
 {...input,players:[poisonedActor]},[poisonedBuild],[runtime],true);
assert.deepEqual(poisonedReplay.combat,enabled.combat,
 'Launch actor attack/defense and skill payload must not leak into class-only combat');

const rarityQuality=1.1*1.15;
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
],true),/equipment_scaling_policy_rejected/);
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
const unconvertedAlchemy={...classActor,
 alchemyModifiers:{outgoing:1,incoming:1,healing:1,shielding:1}};
assert.throws(()=>simulateUnifiedEquipmentCombatV2(
 {...input,players:[unconvertedAlchemy]},[{...build,actor:unconvertedAlchemy}],
 [runtime],true),/legacy_modifiers_require_migration/);
const unconvertedGems={...classActor,
 effectGems:[{id:'legacy-gem'}] as unknown as typeof classActor.effectGems};
assert.throws(()=>simulateUnifiedEquipmentCombatV2(
 {...input,players:[unconvertedGems]},[{...build,actor:unconvertedGems}],
 [runtime],true),/legacy_modifiers_require_migration/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2({
 ...input,initialPlayerState:{
  [classActor.id]:{hp:1200,downed:false,
    cooldownRemainingMs:{},basicAttackRemainingMs:0},
 },
},[build],[runtime],true),/persistent_state_adapter_required/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build],[],true),/complete_build_and_gear_snapshots_required/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(input,[build,build],[runtime],true),/complete_build_and_gear_snapshots_required/);

// A separate, authenticated persistence reader may supply one fully prepared
// Enemy 2.0 kit; this must bypass the generic Class V2 enemy kit compiler.
const taggedEnemy={...foe,tags:['pve:archetype:assassin']};
const authoredInput={...input,enemies:[taggedEnemy]};
const authoredCandidate=prepareSoloEnemyKitsV2(authoredInput.enemies,{
 ruleset:'enemy-v2-prototype-1',serverSeed:authoredInput.seed,
 encounterId:'integrated-authored-1',region:'sunscar',equipmentTier:3,
 eliteEnemyIds:[taggedEnemy.id],
});
const storedAuthored:PersistedEnemyKitV2={
 ...authoredCandidate,source:'server-persisted-v2',revision:1,
};
const trustedAuthored={
 snapshot:storedAuthored,
 verifyPersisted:(_snapshot:PersistedEnemyKitV2,digest:string)=>{
  assert.match(digest,/^[0-9a-f]{64}$/);
  return true;
 },
};
const v2Authored=simulateUnifiedEquipmentCombatV2(
 authoredInput,[build],[runtime],true,trustedAuthored);
const v2Repeat=simulateUnifiedEquipmentCombatV2(
 authoredInput,[build],[runtime],true,trustedAuthored);
assert.deepEqual(v2Authored,v2Repeat,'Frozen server-owned Enemy V2 kits must replay');
assert.ok(v2Authored.combat.enemies[0].definition.tags?.includes('enemy-v2:kit:v1'));
assert.ok(!v2Authored.combat.enemies[0].definition.tags?.includes('combat-v2-enemy'),
 'One Enemy 2.0 authored compiler; no generic double-kit');
assert.ok(!v2Authored.combat.enemies[0].definition.abilities.some(a=>a.id.startsWith('V2_ENEMY_')),
 'Generic class enemy ability is excluded from the authored trait route');
assert.equal(v2Authored.equipmentEvidence.length,1);
assert.equal(v2Authored.combat.players[0].definition.stats.defense,expectedWithAffix,
 'Combining authored enemy kits does not modify verified equipment stats');
assert.throws(()=>simulateUnifiedEquipmentCombatV2(
 authoredInput,[build],[runtime],false,trustedAuthored),/requires_complete_v2/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(
 authoredInput,[build],[runtime],true,{...trustedAuthored,verifyPersisted:()=>false}),
 /unverified_persisted_scope/);
assert.throws(()=>simulateUnifiedEquipmentCombatV2(
 {...authoredInput,seed:'altered-seed'},[build],[runtime],true,trustedAuthored),
 /seed_mismatch/);
const corruptKit={...storedAuthored,preparedEnemies:storedAuthored.preparedEnemies.map(
 e=>({...e,stats:{...e.stats,attackPower:e.stats.attackPower+12}}))};
assert.throws(()=>simulateUnifiedEquipmentCombatV2(
 authoredInput,[build],[runtime],true,{...trustedAuthored,snapshot:corruptKit}),
 /stored_kit_digest_mismatch/);

// Verify handcrafted Asterfall solo boss can be issued a restricted authority
// while its legacy phase is preserved. This is NOT a dungeon boss activation.
const bossDef={...foe,id:'BOSS_EXP_ROOT',name:'Asterfall Root',
 boss:true,tags:[],phases:[{
  id:'LEGACY_PHASE',hpPct:.80,target:'self' as const,effects:[{kind:'shield' as const,flat:7}],
 }]};
const soloBossInput={...input,enemies:[bossDef]};
const bossKit=prepareSoloEnemyKitsV2(soloBossInput.enemies,{
 ruleset:'enemy-v2-prototype-1',serverSeed:soloBossInput.seed,
 encounterId:'integrated-asterfall-boss',region:'asterfall',
 equipmentTier:3,eliteEnemyIds:[],
});
const storedBoss:PersistedEnemyKitV2={...bossKit,source:'server-persisted-v2',revision:2};
const bossFight=simulateUnifiedEquipmentCombatV2(
 soloBossInput,[build],[runtime],true,{
  snapshot:storedBoss,verifyPersisted:()=>true,
 });
assert.equal(bossFight.combat.enemies[0].definition.boss,true);
assert.ok(bossFight.combat.enemies[0].definition.phases?.some(p=>p.id==='LEGACY_PHASE'));
assert.ok(bossFight.combat.enemies[0].definition.phases?.some(p=>p.id==='ROOT_V2_PHASE_70'));
assert.ok(!bossFight.combat.enemies[0].definition.phases?.some(p=>p.id.startsWith('V2_BOSS_PRESSURE_')),
 'Only the handcrafted boss profile may supply V2 boss phases');
assert.deepEqual(bossFight,simulateUnifiedEquipmentCombatV2(
 soloBossInput,[build],[runtime],true,{snapshot:storedBoss,verifyPersisted:()=>true}),
 'Handcrafted solo boss must deterministically replay without a second boss compiler');

console.log('PASS: strict server gear ordering, provenance, no legacy double-counting, deterministic replays');
