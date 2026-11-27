/**
 * STRICT, hidden full Equipment + Classes + Enemies 2.0 encounter.
 *
 * This entrypoint rejects unprepared actors and missing server item snapshots.
 * The older v2 skills-only simulator remains available for isolated tests,
 * but must not silently ignore equipped gear in a real combined encounter.
 *
 * PRODUCTION OFF: no router imports this module.
 */
import {simulateCombat,simulateCombatWithServerAuthoritiesV2} from '../engine';
import {reviewWorldBossProtectionV2,type ProtectionTraceV2} from './world-boss-protection-review';
import {deriveWorldBossPreparationReviewV2,applyWorldBossStartingHpReviewV2,type WorldBossPreparationReviewV2} from './world-boss-preparation-review';
import {compileDraftDungeonRewardCombatV2,type VerifiedDungeonRewardSnapshotV2} from './dungeon-rewards-v2';
import {issueDungeonRewardEngineAuthorityV2} from './dungeon-reward-engine-v2';
import {issueEquipmentV2TraitAuthority,issuePersistedPartyEquipmentV2TraitAuthority,
 type VerifiedV2EquipmentEffectSource} from './equipment-trait-engine-authority';
import {issuePartySyncAuthorityV2,type PartySyncScopeV2} from './party-sync-authority';
import {planPartySynchronizationV2,type SyncPlanV2,type SyncModeV2} from './party-synchronization';
import {reviewPartyV2RunBinding,partySyncScopeFromRunBindingV2,type PartyV2RunBindingResult} from './party-dungeon-persistence-review';
import type {FrozenLoadoutSnapshot} from '../../coop/loadout-snapshots';
import type {ReadyCheckRecord} from '../../coop/ready-checks';
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
import {verifyPersistedEnemyKitsV2,verifyPersistedPartyEnemyKitsV2,type PersistedEnemyKitV2} from './enemy-kit-composer';
import {enemyV2SnapshotDigest,issueEnemyV2EngineAuthority,issuePersistedPartyEnemyV2EngineAuthority} from './enemy-engine-authority';
import {resolveVerifiedEquipmentBaseV2,
  type StoredEquipmentInstanceV2,type EquipmentBaseDefinitionV2,
  type ApprovedEquipmentBasePolicyV2,type BaseEquipmentSourceV2} from './equipment-base-stats';
import {applyVerifiedSetBonusesV2,
  type ApprovedSetPolicyV2,type ResolvedSetEffectV2} from './equipment-set-effects';
import {assertApprovedEquipmentScalingV2,type ApprovedRarityLadderV2} from './equipment-scaling-policy';
import {reviewPowerAttributionV2,
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
interface PersonalStatStagesV2{
 readonly classOnly:CombatStats;
 readonly afterSkills:CombatStats;
 readonly afterItemBase:CombatStats;
 readonly afterSets:CombatStats;
 readonly afterAffixes:CombatStats;
}
interface PersonalStatContributionsV2{
 readonly classOnly:CombatStats;
 readonly skills:CombatStats;
 readonly itemBase:CombatStats;
 readonly sets:CombatStats;
 readonly affixes:CombatStats;
}
const personalStatKeys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion',
 'critChance','critMultiplier','haste',
];
/** Preserve the existing stage rounding and multiplicative semantics. Both
 * base and set policies describe FINAL ceilings; neither may be bypassed
 * by a later stage. This is a rejection boundary, not a new stat cap curve. */
function finalizePersonalStatsV2(
 stages:PersonalStatStagesV2,
 basePolicy:ApprovedEquipmentBasePolicyV2,
 setsPolicy:ApprovedSetPolicyV2,
):PersonalStatContributionsV2{
 for(const key of personalStatKeys){
  const baseLimit=basePolicy.ceilings[key],setLimit=setsPolicy.ceilings[key];
  if(!Number.isFinite(baseLimit)||baseLimit<=0||
     !Number.isFinite(setLimit)||setLimit<=0)
   throw Error('combat_v2_missing_final_personal_stat_ceiling:'+key);
  const actual=stages.afterAffixes[key];
  if(!Number.isFinite(actual)||actual<0||
    (key==='maxHp'&&actual<=0)||(key==='critMultiplier'&&actual<1))
   throw Error('combat_v2_invalid_final_personal_stat:'+key);
  if(actual>Math.min(baseLimit,setLimit))
   throw Error('combat_v2_final_personal_stat_exceeds_ceiling:'+key);
 }
 // Deltas are ordered/marginal, so cross-stage multipliers and historical
 // rounding are attributed exactly once to the stage that applied them.
 const delta=(before:CombatStats,after:CombatStats):CombatStats=>
  Object.fromEntries(personalStatKeys.map(key=>[key,after[key]-before[key]])) as unknown as CombatStats;
 return {classOnly:{...stages.classOnly},
  skills:delta(stages.classOnly,stages.afterSkills),
  itemBase:delta(stages.afterSkills,stages.afterItemBase),
  sets:delta(stages.afterItemBase,stages.afterSets),
  affixes:delta(stages.afterSets,stages.afterAffixes)};
}
export interface EquipmentEncounterEvidenceV2 {
 readonly actorId:string;
 /** QA-only source trace. Not public CP, player stat UI, or untrusted input. */
 readonly classPolicyVersion:string;
 readonly statStages:Readonly<PersonalStatStagesV2>;
 /** Marginal deltas at the existing stage order, not independently priced CP.
  * Encounter effects, advanced affixes and unimplemented sources are separate. */
 readonly statContributions:Readonly<PersonalStatContributionsV2>;
 readonly baseSources:readonly BaseEquipmentSourceV2[];
 readonly setEffects:readonly ResolvedSetEffectV2[];
 readonly affixSources:readonly AppliedEquipmentAffixV2[];
 readonly composition?:PowerCompositionDiagnosticV2;
 readonly powerAttribution?:ReturnType<typeof reviewPowerAttributionV2>;
 /** QA-only: verified reward overlay applied after all equipment/skill stats. */
 readonly afterDungeonReward?:CombatStats;
}
/** Trusted server-only storage dependency. Callbacks and snapshots must never
 * be constructed from incoming client JSON or forwarded by a public route. */
export interface TrustedPersistedEnemyKitV2 {
 readonly snapshot:PersistedEnemyKitV2;
 readonly verifyPersisted:(snapshot:PersistedEnemyKitV2,combatInputDigest:string)=>boolean;
}
/** Hidden trust boundary. Future privileged dungeon transactions must
 * verify current run revision and resolved room receipts atomically. */
export interface TrustedDungeonRewardPortV2 {
 readonly snapshot:VerifiedDungeonRewardSnapshotV2;
 readonly verifyPersisted:(snapshot:VerifiedDungeonRewardSnapshotV2,inputDigest:string)=>boolean;
}
/** Private flexible-party rehearsal, separate from signed persisted dungeon execution. */
export interface TrustedPartySyncRehearsalV2 {
 readonly scope:PartySyncScopeV2;
 readonly verifyPersisted:(scope:PartySyncScopeV2,digest:string)=>boolean;
}
export interface UnifiedEncounterReviewOptionsV2 {
 readonly synchronizationMode?:SyncModeV2;
 readonly synchronization?:TrustedPartySyncRehearsalV2;
 readonly aiPolicy?:'tactical'|'authored-priority';
}
export interface UnifiedEquipmentEncounterResultV2 {
 readonly combat:CombatResult;
 readonly enemyMechanicLabels:readonly string[];
 readonly equipmentEvidence:readonly EquipmentEncounterEvidenceV2[];
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
 const statStages:PersonalStatStagesV2={
  classOnly:{...classOnly.stats},afterSkills:{...skills.stats},
  afterItemBase:{...base.actor.stats},afterSets:{...set.actor.stats},
  afterAffixes:{...affixes.actor.stats},
 };
 const statContributions=finalizePersonalStatsV2(statStages,runtime.basePolicy,runtime.setsPolicy);
 const powerAttribution=runtime.compositionPolicy?
  reviewPowerAttributionV2(statStages,base.sources.length,runtime.compositionPolicy):undefined;
 return {
  actor:affixes.actor,
  evidence:{actorId:actor.id,classPolicyVersion:runtime.classBaselinePolicy.version,
    statStages,statContributions,
    baseSources:base.sources,
    setEffects:set.applied,affixSources:affixes.sources,
    ...(powerAttribution?{composition:powerAttribution.composition,powerAttribution}:{}),},
 };
}
/** One assembly path for fresh and persisted encounters. Array order of
 * independent server snapshots is never an identity or custody proof. */
function compileEquippedEncounterActors(
 input:CombatInput,builds:readonly VerifiedSkillBuildV2[],
 runtime:readonly TrustedEquipmentRuntimeV2[],
){
 if(builds.length!==input.players.length||runtime.length!==input.players.length)
  throw Error('combat_v2_complete_build_and_gear_snapshots_required');
 const byId=new Map<string,VerifiedSkillBuildV2>();
 const gearById=new Map<string,TrustedEquipmentRuntimeV2>();
 const characters=new Set<string>(),actors=new Set<string>(),copies=new Set<string>();
 for(const build of builds){
  if(byId.has(build.actor.id))throw Error('combat_v2_duplicate_build_actor');
  byId.set(build.actor.id,build);
 }
 for(const gear of runtime){
  if(gearById.has(gear.actorId))throw Error('combat_v2_duplicate_equipment_actor');
  if(!gear.characterId||characters.has(gear.characterId))
   throw Error('combat_v2_duplicate_or_missing_equipment_character');
  characters.add(gear.characterId);
  gearById.set(gear.actorId,gear);
 }
 const evidence:EquipmentEncounterEvidenceV2[]=[];
 const players=input.players.map(actor=>{
  if(actors.has(actor.id))throw Error('combat_v2_duplicate_encounter_actor');
  actors.add(actor.id);
  const build=byId.get(actor.id),gear=gearById.get(actor.id);
  if(!build||!gear)throw Error('combat_v2_missing_equipped_build_actor');
  const compiled=compileEquippedActor(actor,build,gear);
  for(const copy of Object.values(build.selected.equipment)){
   if(typeof copy!=='string')continue;
   if(copies.has(copy))throw Error('combat_v2_duplicate_encounter_equipment_copy');
   copies.add(copy);
  }
  evidence.push(compiled.evidence);
  return compiled.actor;
 });
 return {byId,gearById,evidence,players};
}
export function simulateUnifiedEquipmentCombatV2(
 input:CombatInput,
 builds:readonly VerifiedSkillBuildV2[],
 runtime:readonly TrustedEquipmentRuntimeV2[],
 serverEnabled=false,
 authoredEnemyKit?:TrustedPersistedEnemyKitV2,
 traitPort?:TrustedEquipmentTraitReceiptPortV2,
 dungeonRewardPort?:TrustedDungeonRewardPortV2,
 review?:UnifiedEncounterReviewOptionsV2,
):UnifiedEquipmentEncounterResultV2{
 if(!serverEnabled){
  if(review!==undefined)throw Error('combat_v2_sync_requires_complete_v2');
  if(traitPort)throw Error('combat_v2_trait_port_requires_complete_v2');
  if(dungeonRewardPort)throw Error('combat_v2_dungeon_reward_requires_complete_v2');
  if(authoredEnemyKit)throw Error('combat_v2_enemy_kit_requires_complete_v2');
  return {combat:simulateCombat(input),enemyMechanicLabels:[],equipmentEvidence:[]};
 }
 if(review?.synchronization&&(authoredEnemyKit||traitPort||dungeonRewardPort||
    review.synchronizationMode!==review.synchronization.scope.mode))
  throw Error('combat_v2_sync_rehearsal_scope_conflict');
 // Trait execution is limited to new, fully persisted SOLO Enemy/Boss 2.0
 // encounters until authenticated party/dungeon replay custody is implemented.
 if(traitPort&&(!authoredEnemyKit||input.players.length!==1||
   runtime.length!==1||builds.length!==1))
  throw Error('combat_v2_trait_requires_persisted_solo_enemy_and_gear');
 if(dungeonRewardPort&&(!authoredEnemyKit||input.players.length!==1||
   runtime.length!==1||builds.length!==1||
   typeof dungeonRewardPort.verifyPersisted!=='function'))
  throw Error('combat_v2_dungeon_reward_requires_persisted_solo_encounter');
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
 const {byId,gearById,evidence,players}=compileEquippedEncounterActors(input,builds,runtime);
 const synchronizationReview=review?.synchronizationMode===undefined?undefined:
  planPartySynchronizationV2(review.synchronizationMode,input.players.map(actor=>({
   classId:byId.get(actor.id)!.verified.classId,
   characterId:gearById.get(actor.id)!.characterId,
  })));
 if(authoredEnemyKit){
  const snapshot=authoredEnemyKit.snapshot;
  const proof=verifyPersistedEnemyKitsV2(input.enemies,snapshot);
  if(snapshot.seed!==input.seed)
   throw Error('combat_v2_enemy_kit_seed_mismatch');
  const assembledInput:CombatInput={...input,players,enemies:[...proof.enemies]};
  // Source-validated room bonuses are applied AFTER class, skills and exact
  // equipment; the resulting encounter is rebound to both engine authorities.
  const finalInput=dungeonRewardPort?
   compileDraftDungeonRewardCombatV2(
     assembledInput,dungeonRewardPort.snapshot,dungeonRewardPort.verifyPersisted,true).input:
   assembledInput;
  const authority=issueEnemyV2EngineAuthority({
    source:'server-persisted-v2',version:2,ruleset:snapshot.ruleset,mode:'solo',
    encounterId:snapshot.encounterId,revision:snapshot.revision,seed:snapshot.seed,
    playerIds:players.map(p=>p.id),enemyIds:snapshot.enemyIds,bossIds:snapshot.bossIds,
  },finalInput,(_scope,combatDigest)=>
    authoredEnemyKit.verifyPersisted(snapshot,combatDigest));
  const traitAuthority=traitPort?issueEquipmentV2TraitAuthority(finalInput,[
    compileExactEquipmentTraitSourceV2(builds[0],runtime[0],traitPort),
   ],traitPort.verifyPersisted):undefined;
  const rewardAuthority=dungeonRewardPort?
    issueDungeonRewardEngineAuthorityV2(finalInput,dungeonRewardPort.snapshot,
      dungeonRewardPort.verifyPersisted):undefined;
  return {
    combat:simulateCombatWithServerAuthoritiesV2(finalInput,{
     enemy:authority,equipmentTrait:traitAuthority,dungeonReward:rewardAuthority,aiPolicy:review?.aiPolicy,
    }),
    enemyMechanicLabels:proof.preview.flatMap(p=>[
      ...p.abilityNames.map(name=>p.enemyId+': '+name),
      ...p.phaseNames.map(name=>p.enemyId+': '+name),
      ...p.traitIds.map(id=>p.enemyId+': '+id),
    ]),
    equipmentEvidence:dungeonRewardPort?evidence.map(row=>({...row,
     afterDungeonReward:{...finalInput.players.find(p=>p.id===row.actorId)!.stats},
    })):evidence,
    ...(synchronizationReview?{synchronizationReview}:{}),
  };
 }
 const enemies=compileEnemiesForCombatV2(input.enemies,true);
 const finalInput={...input,players,enemies:[...enemies.enemies]};
 const rehearsal=review?.synchronization;
 if(rehearsal&&(!synchronizationReview||rehearsal.scope.members.length!==players.length||
   rehearsal.scope.members.some((m,i)=>m.actorId!==players[i].id||
    m.characterId!==gearById.get(m.actorId)?.characterId||m.classId!==byId.get(m.actorId)?.verified.classId)))
  throw Error('combat_v2_sync_rehearsal_roster_mismatch');
 const syncAuthority=rehearsal?issuePartySyncAuthorityV2(rehearsal.scope,finalInput,rehearsal.verifyPersisted):undefined;
 return {
  combat:simulateCombatWithServerAuthoritiesV2(finalInput,{partySync:syncAuthority,aiPolicy:review?.aiPolicy}),
  enemyMechanicLabels:enemies.mechanicLabels,
  equipmentEvidence:evidence,
  ...(synchronizationReview?{synchronizationReview}:{}),
  ...(rehearsal?{synchronizationRehearsal:{releaseEnabled:false as const,unsupported:[]}}:{}),
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
 reviewAiPolicy:'tactical'|'authored-priority'='tactical',
):UnifiedEquipmentEncounterResultV2{
 if(!serverEnabled)throw Error('combat_v2_persisted_party_disabled');
 if(!party||typeof party.verifyPersisted!=='function'||input.players.length!==4||
   builds.length!==4||runtime.length!==4||party.traitPorts.length!==4||
   input.enemyDamageProfile!==undefined)
  throw Error('combat_v2_invalid_persisted_party_scope');
 const {byId,gearById,evidence,players}=compileEquippedEncounterActors(input,builds,runtime);
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
  combat:simulateCombatWithServerAuthoritiesV2(finalInput,{enemy:enemyAuthority,equipmentTrait:traitAuthority,partySync:syncAuthority,aiPolicy:reviewAiPolicy}),
  enemyMechanicLabels,
  equipmentEvidence:evidence,
  synchronizationReview,
  synchronizationRehearsal:{releaseEnabled:false,unsupported:[]},
  partyPersistenceReview:persistence,
 };
}


/** World Boss V90C/V91A — PRIVATE NONPAYING QA, not an event reservation.
 * Current review limit is three owned characters. No dungeon ready-check,
 * distinct-account rule, legacy fallback, or fabricated source authority.
 * The World Boss V90 transaction/eligibility reader is a separate branch.
 */
export const WORLD_BOSS_SHARED_ENGINE_REVIEW_LIVE=false as const;
export interface WorldBossSharedRosterReviewV2{
 readonly accountId:string;
 readonly eventId:string;
 readonly reservationId:string;
 readonly attempt:number;
 readonly entitlementRevision:number;
 readonly unlockedCharacterSlots:number;
 readonly rosterDigest:string;
 readonly contentVersion:string;
 readonly balanceVersion:string;
 readonly seed:string;
 readonly bossId:'hollowroot'|'sunscar'|'frostmarch';
 readonly phase:'armored'|'exposed'|'enraged';
 readonly preparation?:WorldBossPreparationReviewV2;
 readonly members:readonly {
  readonly characterId:string;
  readonly actorId:string;
  readonly snapshotId:string;
  readonly sourceRevision:number;
  readonly sourceHash:string;
  readonly equipmentReceiptRevision:number;
  readonly equipmentReceiptDigest:string;
 }[];
}
const wbReviewId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/.test(x);
const wbReviewHash=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function wbReviewFail(reason:string):never{throw Error('world_boss_shared_review_'+reason);}

/** Use the exact same class/skill/base/set/affix compiler and exact-copy
 * trait source compiler as the shared dungeon path. This is diagnostic only;
 * the independent frozen source verifier is required before execution. */
export function compileWorldBossRosterReviewV2(
 input:CombatInput,
 builds:readonly VerifiedSkillBuildV2[],
 runtime:readonly TrustedEquipmentRuntimeV2[],
 traitPorts:readonly TrustedEquipmentTraitReceiptPortV2[],
 scope:WorldBossSharedRosterReviewV2,
){
 if(!scope||![scope.accountId,scope.eventId,scope.reservationId,scope.contentVersion,
  scope.balanceVersion].every(wbReviewId)||!Number.isSafeInteger(scope.attempt)||
  scope.attempt<1||scope.attempt>3||!Number.isSafeInteger(scope.entitlementRevision)||
  scope.entitlementRevision<1||!wbReviewHash(scope.rosterDigest)||!Number.isSafeInteger(scope.unlockedCharacterSlots)||
  scope.unlockedCharacterSlots<1||scope.unlockedCharacterSlots>3||
  !['hollowroot','sunscar','frostmarch'].includes(scope.bossId)||
  !['armored','exposed','enraged'].includes(scope.phase)||
  typeof scope.seed!=='string'||scope.seed.length<1||scope.seed.length>256||
  !input||input.seed!==scope.seed||input.initialPlayerState!==undefined||
  input.enemyDamageProfile!==undefined||input.players.length<1||
  input.players.length>scope.unlockedCharacterSlots||
  !Array.isArray(scope.members)||scope.members.length!==input.players.length||
  Array.from(scope.members).some(m=>!m||!wbReviewId(m.snapshotId)||
   !Number.isSafeInteger(m.sourceRevision)||m.sourceRevision<1||!wbReviewHash(m.sourceHash))||
  !Array.isArray(traitPorts)||traitPorts.length!==input.players.length||
  Array.from(traitPorts).some(p=>!p||!wbReviewId(p.characterId)))
  wbReviewFail('invalid_roster_scope');
 const {players,evidence,byId,gearById}=compileEquippedEncounterActors(input,builds,runtime);
 const memberByActor=new Map<string,WorldBossSharedRosterReviewV2['members'][number]>(
  scope.members.map((m:WorldBossSharedRosterReviewV2['members'][number])=>[m.actorId,m]));
 const portByCharacter=new Map<string,TrustedEquipmentTraitReceiptPortV2>(
  traitPorts.map((p:TrustedEquipmentTraitReceiptPortV2)=>[p.characterId,p]));
 const snapshots=new Set(scope.members.map((m:WorldBossSharedRosterReviewV2['members'][number])=>m.snapshotId));
 if(snapshots.size!==players.length)wbReviewFail('duplicate_snapshot');
 if(memberByActor.size!==players.length||portByCharacter.size!==players.length)
  wbReviewFail('duplicate_member_or_port');
 const characters=new Set<string>();
 const sources=players.map(actor=>{
  const member=memberByActor.get(actor.id),gear=gearById.get(actor.id)!;
  const port=portByCharacter.get(gear.characterId);
  if(!member||!port||actor.team!=='players'||actor.combatV2?.version!==2||
   !wbReviewId(member.characterId)||!wbReviewId(member.actorId)||
   member.characterId!==gear.characterId||characters.has(member.characterId)||
   port.accountId!==scope.accountId||port.characterId!==member.characterId||
   !Number.isSafeInteger(member.equipmentReceiptRevision)||member.equipmentReceiptRevision<1||
   member.equipmentReceiptRevision!==port.receiptRevision||
   !wbReviewHash(member.equipmentReceiptDigest)||
   typeof port.verifyPersisted!=='function')
   wbReviewFail('member_ownership_or_revision_mismatch');
  const source=compileExactEquipmentTraitSourceV2(byId.get(actor.id)!,gear,port);
  if(source.equipmentReceiptDigest!==member.equipmentReceiptDigest)
   wbReviewFail('equipment_digest_mismatch');
  characters.add(member.characterId);
  return source;
 });
 return {players,evidence,sources,
  compiledActorDigests:players.map(actor=>({actorId:actor.id,digest:enemyV2SnapshotDigest(actor)})),
  releaseReady:false as const,canAuthorizeCombat:false as const,canGrantRewards:false as const};
}
export interface WorldBossSharedPreviewBindingV2 {
 readonly scope:WorldBossSharedRosterReviewV2;
 readonly bossDefinitionDigest:string;
 readonly compiledInputDigest:string;
 readonly equipmentSourcesDigest:string;
}
/**
 * V91A invokes the real shared millisecond Combat 2.0 engine with fresh
 * exact-copy trait authority and a pinned LOCAL authored boss definition.
 * No global HP, Guard conversion, world settlement, enemy-kit authority,
 * gems/alchemy migration, or synchronization is implied. The independent
 * verifier must confirm the complete binding; synthetic fixtures are QA only.
 */
export function simulateWorldBossSharedEngineReviewV2(
 input:CombatInput,
 builds:readonly VerifiedSkillBuildV2[],
 runtime:readonly TrustedEquipmentRuntimeV2[],
 traitPorts:readonly TrustedEquipmentTraitReceiptPortV2[],
 scope:WorldBossSharedRosterReviewV2,
 verifyFrozen:(binding:WorldBossSharedPreviewBindingV2)=>boolean,
 reviewEnabled=false,
 collectProtection=true,
){
 if(!reviewEnabled||typeof verifyFrozen!=='function')wbReviewFail('disabled');
 if(!input||!Array.isArray(input.enemies)||input.enemies.length!==1||
  !input.enemies[0]||input.enemies[0].id!==scope?.bossId||
  input.enemies[0].team!=='enemies'||input.enemies[0].role!=='enemy'||!input.enemies[0].boss||
  !Number.isSafeInteger(input.tickMs)||input.tickMs!==100||
  typeof input.maxDurationMs!=='number'||!Number.isSafeInteger(input.maxDurationMs)||
  input.maxDurationMs<1000||input.maxDurationMs>180000)
  wbReviewFail('invalid_local_boss_scope');
 const compiled=compileWorldBossRosterReviewV2(input,builds,runtime,traitPorts,scope);
 const preparation=scope.preparation===undefined?undefined:deriveWorldBossPreparationReviewV2(scope.preparation,scope);
 const assembled:CombatInput={...input,players:compiled.players};
 const finalInput:CombatInput=structuredClone(preparation?applyWorldBossStartingHpReviewV2(assembled,preparation):assembled);
 const frozenScope=structuredClone(scope);
 const binding:WorldBossSharedPreviewBindingV2={
  scope:frozenScope,bossDefinitionDigest:enemyV2SnapshotDigest(finalInput.enemies[0]),
  compiledInputDigest:enemyV2SnapshotDigest(finalInput),
  equipmentSourcesDigest:enemyV2SnapshotDigest(compiled.sources),
 };
 const bindingDigest=enemyV2SnapshotDigest(binding);
 const sourceByCharacter=new Map(traitPorts.map(p=>[p.characterId,p.verifyPersisted]));
 const authority=issueEquipmentV2TraitAuthority(finalInput,compiled.sources,(rows,digest)=>{
  if(digest!==binding.compiledInputDigest||enemyV2SnapshotDigest(rows)!==binding.equipmentSourcesDigest)
   return false;
  if(!rows.every(row=>sourceByCharacter.get(row.characterId)?.([row],digest)===true))
   return false;
  return verifyFrozen(binding)===true&&enemyV2SnapshotDigest(binding)===bindingDigest&&
   enemyV2SnapshotDigest(scope)===enemyV2SnapshotDigest(frozenScope);
 });
 const trace:ProtectionTraceV2[]=[];
 const combat=simulateCombatWithServerAuthoritiesV2(finalInput,{equipmentTrait:authority,aiPolicy:'tactical',
  ...(collectProtection?{protectionTrace:trace}:{})});
 const protection=collectProtection?reviewWorldBossProtectionV2(trace,finalInput.players.map(p=>p.id),
  Object.fromEntries([...combat.players,...combat.enemies].map(p=>[p.definition.id,p.shield]))):null;
 return {combat,binding,protection,preparation:preparation??null,compiledActorDigests:compiled.compiledActorDigests,
  equipmentEvidence:compiled.evidence,
  localBossHpLoss:Math.max(0,finalInput.enemies[0].stats.maxHp-combat.enemies[0].hp),
  globalHpCredited:0 as const,releaseReady:false as const,
  persisted:false as const,rewardGranted:false as const,
  enemyKitAuthority:false as const,guardSettlement:false as const};
}
