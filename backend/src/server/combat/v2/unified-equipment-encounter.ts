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
import {issuePartySyncAuthorityV2,type PartySyncScopeV2} from './party-sync-authority';
import {planPartySynchronizationV2,type SyncPlanV2,type SyncModeV2} from './party-synchronization';
import {
 issueEquipmentV2TraitAuthority,issuePersistedPartyEquipmentV2TraitAuthority,
 type VerifiedV2EquipmentEffectSource,
} from './equipment-trait-engine-authority';
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
import {
 verifyPersistedEnemyKitsV2,verifyPersistedPartyEnemyKitsV2,
 type PersistedEnemyKitV2,
} from './enemy-kit-composer';
import {
 enemyV2SnapshotDigest,issueEnemyV2EngineAuthority,issuePersistedPartyEnemyV2EngineAuthority,
} from './enemy-engine-authority';
import {resolveVerifiedEquipmentBaseV2,
  type StoredEquipmentInstanceV2,type EquipmentBaseDefinitionV2,
  type ApprovedEquipmentBasePolicyV2,type BaseEquipmentSourceV2} from './equipment-base-stats';
import {applyVerifiedSetBonusesV2,
  type ApprovedSetPolicyV2,type ResolvedSetEffectV2} from './equipment-set-effects';
import {assertApprovedEquipmentScalingV2,type ApprovedRarityLadderV2} from './equipment-scaling-policy';
import {evaluatePowerCompositionV2,
  type ApprovedPowerCompositionPolicyV2,type PowerCompositionDiagnosticV2} from './power-composition';
import {
 reviewPartyV2RunBinding,partySyncScopeFromRunBindingV2,
 type PartyV2RunBindingResult,
} from './party-dungeon-persistence-review';
import type {FrozenLoadoutSnapshot} from '../../coop/loadout-snapshots';
import type {ReadyCheckRecord} from '../../coop/ready-checks';
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
/** Private QA dependency only; not an authenticated party storage adapter. */
export interface TrustedPartySyncRehearsalV2 {
 readonly scope:PartySyncScopeV2;
 readonly verifyPersisted:(scope:PartySyncScopeV2,digest:string)=>boolean;
}
export interface UnifiedEquipmentEncounterResultV2 {
 readonly combat:CombatResult;
 readonly enemyMechanicLabels:readonly string[];
 readonly equipmentEvidence:readonly EquipmentEncounterEvidenceV2[];
 /** Explicit review opt-in: composition evidence only, never a combat buff. */
 readonly synchronizationReview?:SyncPlanV2;
 readonly synchronizationRehearsal?:{readonly releaseEnabled:false;readonly unsupported:readonly string[]};
 readonly partyPersistenceReview?:PartyV2RunBindingResult;
}
function compileEquippedActor(
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
 synchronizationReviewMode?:SyncModeV2,
 syncRehearsal?:TrustedPartySyncRehearsalV2,
):UnifiedEquipmentEncounterResultV2{
 if(!serverEnabled){
  if(syncRehearsal||synchronizationReviewMode!==undefined)throw Error('combat_v2_sync_requires_complete_v2');
  if(traitPort)throw Error('combat_v2_trait_port_requires_complete_v2');
  if(authoredEnemyKit)throw Error('combat_v2_enemy_kit_requires_complete_v2');
  return {combat:simulateCombat(input),enemyMechanicLabels:[],equipmentEvidence:[]};
 }
 if(syncRehearsal&&(authoredEnemyKit||traitPort||synchronizationReviewMode!==syncRehearsal.scope.mode))
  throw Error('combat_v2_sync_rehearsal_scope_conflict');
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
 // Use only the class identity and character ID that survived the complete
 // private build/equipment compilation. This is a review snapshot, not proof
 // of real party membership, and does not touch combat stats or CP.
 const synchronizationReview=synchronizationReviewMode===undefined?undefined:
  planPartySynchronizationV2(synchronizationReviewMode,input.players.map(actor=>({
   classId:byId.get(actor.id)!.verified.classId,
   characterId:gearById.get(actor.id)!.characterId,
  })));
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
    ...(synchronizationReview?{synchronizationReview}:{}),
  };
 }
 const enemies=compileEnemiesForCombatV2(input.enemies,true);
 const finalInput={...input,players,enemies:[...enemies.enemies]};
 if(syncRehearsal&&(!synchronizationReview||syncRehearsal.scope.members.length!==players.length||
  syncRehearsal.scope.members.some((m,i)=>m.actorId!==players[i].id||
   m.characterId!==gearById.get(m.actorId)?.characterId||m.classId!==byId.get(m.actorId)?.verified.classId)))
  throw Error('combat_v2_sync_rehearsal_roster_mismatch');
 const syncAuthority=syncRehearsal?issuePartySyncAuthorityV2(syncRehearsal.scope,finalInput,syncRehearsal.verifyPersisted):undefined;
 return {
  combat:simulateCombat(finalInput,undefined,undefined,syncAuthority),
  ...(syncRehearsal?{synchronizationRehearsal:{releaseEnabled:false as const,
    unsupported:[]}}:{}),
  enemyMechanicLabels:enemies.mechanicLabels,
  equipmentEvidence:evidence,
  ...(synchronizationReview?{synchronizationReview}:{}),
 };
}


export interface TrustedPersistedPartyExecutionV2{
 readonly runId:string;
 readonly nodeId:string;
 readonly encounterRevision:number;
 readonly stateRevision:number;
 readonly contentVersion:string;
 readonly balanceVersion:string;
 readonly readyCheck:ReadyCheckRecord;
 readonly frozenRoster:readonly FrozenLoadoutSnapshot[];
 readonly traitPorts:readonly TrustedEquipmentTraitReceiptPortV2[];
 readonly enemyKit?:TrustedPersistedEnemyKitV2;
 readonly verifyPersisted:(binding:PartyV2RunBindingResult['binding'],
  sources:readonly VerifiedV2EquipmentEffectSource[],combatInputDigest:string)=>boolean;
}

/**
 * Hidden persisted four-player execution rehearsal.
 * Uses the current co-op ready-check/loadout provenance plus exact-copy EQ2
 * receipts. Required party-mode Enemy/Boss 2.0 receipts are verified
 * against the same finalized run digest as traits and Synchronization.
 */
export function simulateUnifiedEquipmentPersistedPartyCombatV2(
 input:CombatInput,
 builds:readonly VerifiedSkillBuildV2[],
 runtime:readonly TrustedEquipmentRuntimeV2[],
 party:TrustedPersistedPartyExecutionV2,
 serverEnabled=false,
 synchronizationEnabled=true,
):UnifiedEquipmentEncounterResultV2{
 if(!serverEnabled)throw Error('combat_v2_persisted_party_disabled');
 if(!party||typeof party.verifyPersisted!=='function'||input.players.length!==4||
   builds.length!==4||runtime.length!==4||party.traitPorts.length!==4||
   input.enemyDamageProfile!==undefined)
  throw Error('combat_v2_invalid_persisted_party_scope');
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
 const portByCharacter=new Map<string,TrustedEquipmentTraitReceiptPortV2>();
 for(const port of party.traitPorts){
  if(!port||!port.characterId||portByCharacter.has(port.characterId))
   throw Error('combat_v2_duplicate_or_invalid_trait_port_character');
  portByCharacter.set(port.characterId,port);
 }
 const sources=players.map(actor=>{
  const build=byId.get(actor.id)!,gear=gearById.get(actor.id)!;
  const port=portByCharacter.get(gear.characterId);
  if(!port)throw Error('combat_v2_missing_trait_port_for_character');
  return compileExactEquipmentTraitSourceV2(build,gear,port);
 });
 const kit=party.enemyKit;
 if(!kit||typeof kit.verifyPersisted!=='function')
  throw Error('combat_v2_party_enemy_kit_required');
 const partyEnemySnapshot=structuredClone(kit.snapshot);
 const kitDigest=enemyV2SnapshotDigest(partyEnemySnapshot);
 const verifyKit=kit.verifyPersisted;
 let finalEnemies:readonly CombatantDefinition[];
 let enemyMechanicLabels:readonly string[];
 {
  const proof=verifyPersistedPartyEnemyKitsV2(input.enemies,partyEnemySnapshot);
  if(partyEnemySnapshot.seed!==input.seed)
   throw Error('combat_v2_party_enemy_kit_seed_mismatch');
  if(partyEnemySnapshot.encounterId!==party.runId+':'+party.nodeId||
     partyEnemySnapshot.revision!==party.encounterRevision)
   throw Error('combat_v2_party_enemy_kit_revision_mismatch');
  finalEnemies=proof.enemies;
  enemyMechanicLabels=proof.preview.flatMap(p=>[
   ...p.abilityNames.map(name=>p.enemyId+': '+name),
   ...p.phaseNames.map(name=>p.enemyId+': '+name),
   ...p.traitIds.map(id=>p.enemyId+': '+id),
  ]);
 }
 const finalInput:CombatInput={...input,players,enemies:[...finalEnemies]};
 const persistence=reviewPartyV2RunBinding({
  runId:party.runId,nodeId:party.nodeId,encounterRevision:party.encounterRevision,
  stateRevision:party.stateRevision,contentVersion:party.contentVersion,
  balanceVersion:party.balanceVersion,seed:finalInput.seed,
  readyCheck:party.readyCheck,frozenRoster:party.frozenRoster,
  actorCharacterIds:Object.fromEntries(runtime.map(row=>[row.actorId,row.characterId])),
  combatInput:finalInput,
 });
 const scope=partySyncScopeFromRunBindingV2(persistence);
 // Verify the exact immutable receipt set once. A per-character verifier must
 // also approve its own source; the combined callback alone is insufficient.
 const verifyRun=party.verifyPersisted;
 const verifyPorts=players.map(actor=>portByCharacter.get(gearById.get(actor.id)!.characterId)!.verifyPersisted);
 let verifiedDigest:string|undefined;
 const traitAuthority=issuePersistedPartyEquipmentV2TraitAuthority(
  finalInput,sources,persistence.binding,(binding,verifiedSources,digest)=>{
   if(!verifiedSources.every((row,i)=>verifyPorts[i]([row],digest)===true)||
      verifyRun(binding,verifiedSources,digest)!==true)return false;
   verifiedDigest=digest;
   return true;
  });
 const syncAuthority=synchronizationEnabled?
  issuePartySyncAuthorityV2(scope,finalInput,(_scope,digest)=>digest===verifiedDigest):undefined;
 const enemyAuthority=issuePersistedPartyEnemyV2EngineAuthority(
  finalInput,persistence.binding,partyEnemySnapshot.enemyIds,partyEnemySnapshot.bossIds,
  (_binding,digest)=>digest===verifiedDigest&&
   enemyV2SnapshotDigest(partyEnemySnapshot)===kitDigest&&
   enemyV2SnapshotDigest(kit.snapshot)===kitDigest&&
   verifyKit(partyEnemySnapshot,digest)===true&&
   enemyV2SnapshotDigest(partyEnemySnapshot)===kitDigest&&
   enemyV2SnapshotDigest(kit.snapshot)===kitDigest);
 const synchronizationReview=planPartySynchronizationV2('dungeon',scope.members);
 return {
  combat:simulateCombat(finalInput,enemyAuthority,traitAuthority,syncAuthority),
  enemyMechanicLabels,
  equipmentEvidence:evidence,
  synchronizationReview,
  synchronizationRehearsal:{releaseEnabled:false,unsupported:[]},
  partyPersistenceReview:persistence,
 };
}
