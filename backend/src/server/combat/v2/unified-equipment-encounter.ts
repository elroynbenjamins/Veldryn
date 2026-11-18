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
import type {CombatInput,CombatResult,CombatantDefinition} from '../types';
import type {ClassIdV2,GearSlotV2} from './build-contract';
import {validateBuildV2} from './build-contract';
import {serverBuildCatalogV2} from './skill-catalog';
import {compileServerSkillBuildV2,type VerifiedSkillBuildV2} from './skill-effects';
import {compileEnemiesForCombatV2} from './enemy-bridge';
import {resolveVerifiedEquipmentBaseV2,
  type StoredEquipmentInstanceV2,type EquipmentBaseDefinitionV2,
  type ApprovedEquipmentBasePolicyV2,type BaseEquipmentSourceV2} from './equipment-base-stats';
import {applyVerifiedSetBonusesV2,
  type ApprovedSetPolicyV2,type ResolvedSetEffectV2} from './equipment-set-effects';
import {evaluatePowerCompositionV2,
  type ApprovedPowerCompositionPolicyV2,type PowerCompositionDiagnosticV2} from './power-composition';
import {compileTrustedEquipmentAffixesV2,
  type TrustedEquipmentItemAffixesV2,type ServerAffixPolicyV2,
  type AppliedEquipmentAffixV2} from './equipment-affixes';

export interface TrustedEquipmentRuntimeV2 {
 readonly actorId:string;
 readonly characterId:string;
 /** Only from the server's currently owned/equipped instance ledger. */
 readonly instancesById:Readonly<Record<string,StoredEquipmentInstanceV2>>;
 /** Only from a versioned, approved server item catalogue. */
 readonly definitionsByItemId:Readonly<Record<string,EquipmentBaseDefinitionV2>>;
 readonly affixesByInstanceId:Readonly<Record<string,TrustedEquipmentItemAffixesV2>>;
 readonly basePolicy:ApprovedEquipmentBasePolicyV2;
 readonly setsPolicy:ApprovedSetPolicyV2;
 readonly affixPolicy:ServerAffixPolicyV2;
 /** Optional until canonical CP weights are approved; no invented shares. */
 readonly compositionPolicy?:ApprovedPowerCompositionPolicyV2;
}
export interface EquipmentEncounterEvidenceV2 {
 readonly actorId:string;
 readonly baseSources:readonly BaseEquipmentSourceV2[];
 readonly setEffects:readonly ResolvedSetEffectV2[];
 readonly affixSources:readonly AppliedEquipmentAffixV2[];
 readonly composition?:PowerCompositionDiagnosticV2;
}
export interface UnifiedEquipmentEncounterResultV2 {
 readonly combat:CombatResult;
 readonly enemyMechanicLabels:readonly string[];
 readonly equipmentEvidence:readonly EquipmentEncounterEvidenceV2[];
}
function compileEquippedActor(
 actor:CombatantDefinition,
 build:VerifiedSkillBuildV2,
 runtime:TrustedEquipmentRuntimeV2,
):{actor:CombatantDefinition;evidence:EquipmentEncounterEvidenceV2}{
 if(runtime.actorId!==actor.id||!runtime.characterId||build.actor!==actor)
   throw Error('combat_v2_equipment_actor_not_verified');
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
 const skills=compileServerSkillBuildV2(true,build);
 const base=resolveVerifiedEquipmentBaseV2(
  skills,build.verified.classId,runtime.characterId,requested,checked,
  runtime.instancesById,runtime.definitionsByItemId,runtime.basePolicy,true);
 const set=applyVerifiedSetBonusesV2(base.actor,checked,runtime.setsPolicy,true);
 const affixes=compileTrustedEquipmentAffixesV2(
  set.actor,ids.map(id=>runtime.affixesByInstanceId[id]),runtime.affixPolicy,true);
 return {
  actor:affixes.actor,
  evidence:{actorId:actor.id,baseSources:base.sources,
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
):UnifiedEquipmentEncounterResultV2{
 if(!serverEnabled)
  return {combat:simulateCombat(input),enemyMechanicLabels:[],equipmentEvidence:[]};
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
 const enemies=compileEnemiesForCombatV2(input.enemies,true);
 return {
  combat:simulateCombat({...input,players,enemies:[...enemies.enemies]}),
  enemyMechanicLabels:enemies.mechanicLabels,
  equipmentEvidence:evidence,
 };
}
