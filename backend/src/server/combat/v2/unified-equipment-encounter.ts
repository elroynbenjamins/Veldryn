/**
 * STRICT, hidden full Equipment + Classes + Enemies 2.0 encounter.
 *
 * This entrypoint rejects unprepared actors and missing server item snapshots.
 * The older v2 skills-only simulator remains available for isolated tests,
 * but must not silently ignore equipped gear in a real combined encounter.
 *
 * PRODUCTION OFF: no router imports this module.
 */
import {simulateCombat} from '../engine';
import {issueEquipmentV2TraitAuthority} from './equipment-trait-engine-authority';
import {
 compileExactEquipmentTraitSourceV2,type TrustedEquipmentTraitReceiptPortV2,
} from './equipment-trait-exact-copy-adapter';
import type {CombatInput,CombatResult,CombatantDefinition,CombatStats} from '../types';
import type {GearSlotV2} from './build-contract';
import {validateBuildV2} from './build-contract';
import {serverBuildCatalogV2} from './skill-catalog';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from './skill-effects';
import {issueClassOnlyActorV2,type ApprovedClassBaselinePolicyV2} from './class-baseline';
import {compileEnemiesForCombatV2} from './enemy-bridge';
import {verifyPersistedEnemyKitsV2,type PersistedEnemyKitV2} from './enemy-kit-composer';
import {issueEnemyV2EngineAuthority} from './enemy-engine-authority';
import {resolveVerifiedEquipmentBaseV2,
  type StoredEquipmentInstanceV2,type EquipmentBaseDefinitionV2,
  type ApprovedEquipmentBasePolicyV2,type BaseEquipmentSourceV2} from './equipment-base-stats';
import {applyVerifiedSetBonusesV2,
  type ApprovedSetPolicyV2,type ResolvedSetEffectV2} from './equipment-set-effects';
import {assertApprovedEquipmentScalingV2,type ApprovedRarityLadderV2} from './equipment-scaling-policy';
import {evaluatePowerCompositionV2,
  type ApprovedPowerCompositionPolicyV2,type PowerCompositionDiagnosticV2} from './power-composition';
import {compileTrustedEquipmentAffixesV2,
  type TrustedEquipmentItemAffixesV2,type ServerAffixPolicyV2,
  type AppliedEquipmentAffixV2} from './equipment-affixes';

export interface TrustedEquipmentRuntimeV2 {
 readonly actorId:string;
 readonly characterId:string;
 /** Mandatory, versioned class-only source; never trust launch actor stats. */
 readonly classBaselinePolicy:ApprovedClassBaselinePolicyV2;
 /** Only from the server's currently owned/equipped instance ledger. */
 readonly instancesById:Readonly<Record<string,StoredEquipmentInstanceV2>>;
 /** Only from a versioned, approved server item catalogue. */
 readonly definitionsByItemId:Readonly<Record<string,EquipmentBaseDefinitionV2>>;
 readonly affixesByInstanceId:Readonly<Record<string,TrustedEquipmentItemAffixesV2>>;
 readonly basePolicy:ApprovedEquipmentBasePolicyV2;
 /** Server-approved rarity order + multipliers. Mandatory on v2. */
 readonly rarityPolicy:ApprovedRarityLadderV2;
 readonly setsPolicy:ApprovedSetPolicyV2;
 readonly affixPolicy:ServerAffixPolicyV2;
 /** Optional until canonical CP weights are approved; no invented shares. */
 readonly compositionPolicy?:ApprovedPowerCompositionPolicyV2;
}
export interface EquipmentEncounterEvidenceV2 {
 readonly actorId:string;
 /** QA-only source trace. Not public CP, player stat UI, or untrusted input. */
 readonly classPolicyVersion:string;
 readonly statStages:Readonly<{
   classOnly:CombatStats;
   afterSkills:CombatStats;
   afterItemBase:CombatStats;
   afterSets:CombatStats;
   afterAffixes:CombatStats;
 }>;
 readonly baseSources:readonly BaseEquipmentSourceV2[];
 readonly setEffects:readonly ResolvedSetEffectV2[];
 readonly affixSources:readonly AppliedEquipmentAffixV2[];
 readonly composition?:PowerCompositionDiagnosticV2;
}
/** Trusted server-only storage dependency. Callbacks and snapshots must never
 * be constructed from incoming client JSON or forwarded by a public route. */
export interface TrustedPersistedEnemyKitV2 {
 readonly snapshot:PersistedEnemyKitV2;
 readonly verifyPersisted:(snapshot:PersistedEnemyKitV2,combatInputDigest:string)=>boolean;
}
export interface UnifiedEquipmentEncounterResultV2 {
 readonly combat:CombatResult;
 readonly enemyMechanicLabels:readonly string[];
 readonly equipmentEvidence:readonly EquipmentEncounterEvidenceV2[];
}
/** Server-internal full EQ2 build compiler reused by hidden Party V92 QA.
 * Keep trust anchored in the supplied verified build, policies and exact items. */
export function compileEquippedActor(
 actor:CombatantDefinition,
 build:VerifiedSkillBuildV2,
 runtime:TrustedEquipmentRuntimeV2,
):{actor:CombatantDefinition;evidence:EquipmentEncounterEvidenceV2}{
 if(runtime.actorId!==actor.id||!runtime.characterId||build.actor!==actor)
   throw Error('combat_v2_equipment_actor_not_verified');
 // Legacy gems and alchemy must not disappear silently. Their full 2.0
 // source-owned adapters are required before enabling this encounter.
 if((actor.effectGems?.length??0)>0||actor.alchemyModifiers)
   throw Error('combat_v2_legacy_modifiers_require_migration');

 // Every selected instance must have a corroborating source ledger row and
 // stored affix state. Banked and other-character instances never count.
 const requested=build.selected.equipment;
 const ids=Object.values(requested).filter((id):id is string=>typeof id==='string');
 const unique=new Set(ids);
 if(ids.length!==unique.size)throw Error('combat_v2_duplicate_equipped_instance');
 const catalog=serverBuildCatalogV2(build.ownedItemsById,build.setsById);
 const checked=validateBuildV2(build.verified,build.selected,catalog);
 if(!checked.valid)throw Error('combat_v2_invalid_equipment_loadout:'+checked.issues.map(i=>i.code).join(','));
 for(const [slot,id] of Object.entries(requested) as [GearSlotV2,string][]){
  const item=runtime.instancesById[id],affix=runtime.affixesByInstanceId[id];
  if(!item||!affix||affix.instanceId!==id||item.id!==id||
    item.ownerCharacterId!==runtime.characterId||
    affix.tier!==item.tier||affix.rarity!==item.rarity||affix.quality!==item.quality||
    affix.slot!==slot)
    throw Error('combat_v2_missing_authoritative_equipment_snapshot');
  const verifiedItem=catalog.itemsByInstanceId[id];
  const def=runtime.definitionsByItemId[item.itemId];
  if(!verifiedItem||!def||verifiedItem.instanceId!==id||
    verifiedItem.slot!==slot||verifiedItem.tier!==item.tier||
    def.tier!==item.tier||def.slot!==slot)
    throw Error('combat_v2_equipment_catalog_mismatch');
 }
 // Reject unselected items in the delivered effect ledger, rather than
 // accidentally giving a banked or another-character item hidden power.
 for(const key of Object.keys(runtime.affixesByInstanceId))
  if(!unique.has(key))throw Error('combat_v2_extra_equipment_affix_snapshot');
 // Strict boundary: the launch actor's stats/abilities may already contain
 // legacy gear. Only verified server class-level policy can issue the base.
 const classOnly=issueClassOnlyActorV2(actor,build.verified,runtime.classBaselinePolicy);
 const skills=compileServerSkillBuildV2(true,{...build,actor:classOnly});
 // Gate every full encounter on the verified and deterministic 0–100
 // quality curve and authored rarity ordering before changing stats.
 assertApprovedEquipmentScalingV2(runtime.basePolicy,runtime.rarityPolicy);
 const base=resolveVerifiedEquipmentBaseV2(
  skills,build.verified.classId,runtime.characterId,requested,checked,
  runtime.instancesById,runtime.definitionsByItemId,runtime.basePolicy,true);
 const set=applyVerifiedSetBonusesV2(base.actor,checked,runtime.setsPolicy,true);
 const affixes=compileTrustedEquipmentAffixesV2(
  set.actor,ids.map(id=>runtime.affixesByInstanceId[id]),runtime.affixPolicy,true);
 return {
  actor:affixes.actor,
  evidence:{actorId:actor.id,classPolicyVersion:runtime.classBaselinePolicy.version,
    statStages:{
     classOnly:{...classOnly.stats},afterSkills:{...skills.stats},
     afterItemBase:{...base.actor.stats},afterSets:{...set.actor.stats},
     afterAffixes:{...affixes.actor.stats},
    },
    baseSources:base.sources,
    setEffects:set.applied,affixSources:affixes.sources,
    ...(runtime.compositionPolicy?{
      composition:evaluatePowerCompositionV2(base.classLevelStats,affixes.actor.stats,
        base.sources.length,runtime.compositionPolicy),
    }:{}),},
 };
}
export function simulateUnifiedEquipmentCombatV2(
 input:CombatInput,
 builds:readonly VerifiedSkillBuildV2[],
 runtime:readonly TrustedEquipmentRuntimeV2[],
 serverEnabled=false,
 authoredEnemyKit?:TrustedPersistedEnemyKitV2,
 traitPort?:TrustedEquipmentTraitReceiptPortV2,
):UnifiedEquipmentEncounterResultV2{
 if(!serverEnabled){
  if(traitPort)throw Error('combat_v2_trait_port_requires_complete_v2');
  if(authoredEnemyKit)throw Error('combat_v2_enemy_kit_requires_complete_v2');
  return {combat:simulateCombat(input),enemyMechanicLabels:[],equipmentEvidence:[]};
 }
 // Trait execution is limited to new, fully persisted SOLO Enemy/Boss 2.0
 // encounters until authenticated party/dungeon replay custody is implemented.
 if(traitPort&&(!authoredEnemyKit||input.players.length!==1||
   runtime.length!==1||builds.length!==1))
  throw Error('combat_v2_trait_requires_persisted_solo_enemy_and_gear');
 if(authoredEnemyKit&&(
   input.players.length!==1||runtime.length!==1||builds.length!==1||
   input.enemyDamageProfile!==undefined||
   typeof authoredEnemyKit.verifyPersisted!=='function'))
  throw Error('combat_v2_enemy_kit_solo_trust_required');
 // Persistent dungeon/party HP and cooldown snapshots from old combat use
 // a different stat budget. Never reuse them with new 2.0 max HP without a
 // verified, versioned state-conversion adapter.
 if(input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0)
   throw Error('combat_v2_persistent_state_adapter_required');
 if(builds.length!==input.players.length||runtime.length!==input.players.length)
   throw Error('combat_v2_complete_build_and_gear_snapshots_required');
 const byId=new Map<string,VerifiedSkillBuildV2>();
 const gearById=new Map<string,TrustedEquipmentRuntimeV2>();
 for(const build of builds){
  if(byId.has(build.actor.id))throw Error('combat_v2_duplicate_build_actor');
  byId.set(build.actor.id,build);
 }
 for(const gear of runtime){
  if(gearById.has(gear.actorId))throw Error('combat_v2_duplicate_equipment_actor');
  gearById.set(gear.actorId,gear);
 }
 const evidence:EquipmentEncounterEvidenceV2[]=[];
 const players=input.players.map(actor=>{
  const build=byId.get(actor.id),gear=gearById.get(actor.id);
  if(!build||!gear)throw Error('combat_v2_missing_equipped_build_actor');
  const compiled=compileEquippedActor(actor,build,gear);
  evidence.push(compiled.evidence);
  return compiled.actor;
 });
 if(authoredEnemyKit){
  const snapshot=authoredEnemyKit.snapshot;
  const proof=verifyPersistedEnemyKitsV2(input.enemies,snapshot);
  if(snapshot.seed!==input.seed)
   throw Error('combat_v2_enemy_kit_seed_mismatch');
  const finalInput:CombatInput={...input,players,enemies:[...proof.enemies]};
  const authority=issueEnemyV2EngineAuthority({
    source:'server-persisted-v2',version:2,ruleset:snapshot.ruleset,mode:'solo',
    encounterId:snapshot.encounterId,revision:snapshot.revision,seed:snapshot.seed,
    playerIds:players.map(p=>p.id),enemyIds:snapshot.enemyIds,bossIds:snapshot.bossIds,
  },finalInput,(_scope,combatDigest)=>
    authoredEnemyKit.verifyPersisted(snapshot,combatDigest));
  const traitAuthority=traitPort?issueEquipmentV2TraitAuthority(finalInput,[
    compileExactEquipmentTraitSourceV2(builds[0],runtime[0],traitPort),
   ],traitPort.verifyPersisted):undefined;
  return {
    combat:simulateCombat(finalInput,authority,traitAuthority),
    enemyMechanicLabels:proof.preview.flatMap(p=>[
      ...p.abilityNames.map(name=>p.enemyId+': '+name),
      ...p.phaseNames.map(name=>p.enemyId+': '+name),
      ...p.traitIds.map(id=>p.enemyId+': '+id),
    ]),
    equipmentEvidence:evidence,
  };
 }
 const enemies=compileEnemiesForCombatV2(input.enemies,true);
 return {
  combat:simulateCombat({...input,players,enemies:[...enemies.enemies]}),
  enemyMechanicLabels:enemies.mechanicLabels,
  equipmentEvidence:evidence,
 };
}
