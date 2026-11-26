import type { CoopRouteGraph } from '../../shared/coop-types';
import { combatantFromVerifiedSnapshot } from '../combat/snapshot-adapter';
import type { CombatantDefinition } from '../combat/types';
import { EXPEDITIONS } from '../expeditions/content/launch-content';
import { initialPersistentRunState, purchaseMerchantOffer, resolveCoopNode, type PersistentRunState, type NodeResolutionResult } from '../expeditions/node-resolution';
import { generateCoopRouteGraph,DUNGEON_ENDURANCE } from '../expeditions/route-generation';
import { marksForRun } from '../expeditions/rewards';
import {currentDungeonBaseMarks,frozenRunBaseMarks} from '../expeditions/reward-base';
import type { FrozenLoadoutSnapshot } from './loadout-snapshots';
import { recruitQModeAllies, type PublishedEcho } from './echo-recruitment';
import { validateCoopRoster, validateUniqueDamageClasses } from './invariants';
import {regularDungeonTierRequiredLevel,regularDungeonTierRequiredPower} from './dungeon-entry-policy';
import {REGIONAL_DUNGEON_BALANCE_VERSION,regionalPowerMultipliers,regionalCombatPowerBoost} from './regional-power-balance';
import {preparedCoopCombatants} from './potion-modifiers';
import {scaleSocialEchoToHost} from './social-echo-balance';
import {COOP_HOST_LEVEL_NORMALIZATION_VERSION} from './normalization';
import {dungeonEncounterDepthMultipliers,dungeonBossTimeLimitMs,DUNGEON_BOSS_ENDURANCE_VERSION} from './dungeon-depth-scaling';
import {roomBoonOffers,applyRoomBoon,type RoomBoonId} from './room-boon-choices';
import {roomArtifactOffers,applyRoomArtifact} from './room-artifact-choices';
import type {DungeonArtifactId} from './dungeon-artifacts';

export interface QModeRun {
 id:string; requestId:string; controllerAccountId:string; expeditionId:string; tier:1|2|3|4|5;
 graph:CoopRouteGraph; currentNodeId:string; phase:'awaiting_choice'|'completed'|'failed';
 players:CombatantDefinition[]; persistentState:PersistentRunState; enduranceRouteVersion?:1; bossEnduranceVersion?:typeof DUNGEON_BOSS_ENDURANCE_VERSION; tierScalingVersion?:2; regionalBalanceVersion?:1; rootboundT3CalibrationVersion?:1; qmodePressureVersion?:1; echoSourceAccountIds:string[]; npcCharacterIds?:string[]; rewardBaseMarks?:number; rewardMarks?:number; chosenRoomBoons?:Record<string,RoomBoonId>; chosenRoomArtifacts?:Record<string,DungeonArtifactId>;
 lastResolution?:{nodeId:string;result:NodeResolutionResult};
}
export interface QModeRunRepository {get(runId:string):QModeRun|undefined; getByRequest(accountId:string,requestId:string):QModeRun|undefined; save(run:QModeRun):void;}
export class MemoryQModeRunRepository implements QModeRunRepository{
 private runs=new Map<string,QModeRun>(); private requests=new Map<string,string>();
 get(runId:string){const run=this.runs.get(runId);return run?structuredClone(run):undefined;}
 getByRequest(accountId:string,requestId:string){const id=this.requests.get(`${accountId}:${requestId}`);return id?this.get(id):undefined;}
 save(run:QModeRun){this.runs.set(run.id,structuredClone(run));this.requests.set(`${run.controllerAccountId}:${run.requestId}`,run.id);}
}

function combatant(snapshot:FrozenLoadoutSnapshot):CombatantDefinition{return combatantFromVerifiedSnapshot(snapshot.normalized.snapshot,snapshot.normalized.abilities);}
function regionalCombatant(snapshot:FrozenLoadoutSnapshot,expeditionId:string,balanceVersion:string):CombatantDefinition{
 const base=combatant(snapshot);
 const boost=regionalCombatPowerBoost(expeditionId,snapshot.combatPower,balanceVersion===REGIONAL_DUNGEON_BALANCE_VERSION);
 if(boost===1)return base;
 // Role-defining attack/heal receives the clearest gear benefit. Mitigation
 // and durability grow more gently; no PvP, world combat or legacy run changes.
 const survival=1+(boost-1)*.7;
 return {...base,stats:{...base.stats,attackPower:base.stats.attackPower*boost,healingPower:base.stats.healingPower*boost,
  defense:base.stats.defense*survival,maxHp:base.stats.maxHp*survival}};
}

export class QModeService{
 constructor(private repository:QModeRunRepository,private serverSecret:string){}
 create(input:{requestId:string;runId:string;controllerAccountId:string;controllerSnapshot:FrozenLoadoutSnapshot;expeditionId:string;tier:1|2|3|4|5;contentVersion:string;balanceVersion:string;nowMs:number;profiles:PublishedEcho[];npcSnapshots?:readonly FrozenLoadoutSnapshot[];preferredProfileIds?:readonly string[]}):QModeRun{
  const prior=this.repository.getByRequest(input.controllerAccountId,input.requestId);if(prior)return prior;
  const definition=EXPEDITIONS[input.expeditionId];if(!definition)throw new Error('unknown_expedition');if(!definition.coopImplemented)throw new Error('expedition_not_implemented');
  const allies=recruitQModeAllies({serverSecret:this.serverSecret,requestId:input.requestId,controllerAccountId:input.controllerAccountId,controllerRole:input.controllerSnapshot.readiness.role,controllerClassId:input.controllerSnapshot.classId,contentVersion:input.contentVersion,nowMs:input.nowMs,profiles:input.profiles,npcSnapshots:input.npcSnapshots??[],preferredProfileIds:input.preferredProfileIds});
  const requiredLevel=regularDungeonTierRequiredLevel(definition,input.tier);
  for(const snapshot of [input.controllerSnapshot,...allies.map(ally=>ally.snapshot)])if((snapshot.characterLevel??snapshot.normalized.before.level)<requiredLevel)throw new Error(`character_below_tier_level:${snapshot.characterId}`);
  // Solo/Echo runs are level-gated; keep CP enforcement in createLive only.
  validateCoopRoster([{accountId:input.controllerAccountId,characterId:input.controllerSnapshot.characterId,role:input.controllerSnapshot.readiness.role},...allies.map(ally=>({accountId:ally.snapshot.accountId,characterId:ally.snapshot.characterId,role:ally.snapshot.readiness.role}))]);
  validateUniqueDamageClasses([input.controllerSnapshot,...allies.map(ally=>ally.snapshot)].map(snapshot=>({role:snapshot.readiness.role,classId:snapshot.classId})));
  const player=regionalCombatant(input.controllerSnapshot,input.expeditionId,input.balanceVersion);
  const preferred=new Set(input.preferredProfileIds??[]);
  const regionalEnabled=input.balanceVersion===REGIONAL_DUNGEON_BALANCE_VERSION;
  const hostBoost=regionalCombatPowerBoost(input.expeditionId,input.controllerSnapshot.combatPower,regionalEnabled);
  const players=[player,...allies.map(ally=>{
   const base=regionalCombatant(ally.snapshot,input.expeditionId,input.balanceVersion);
   // Host-level normalization already bounds the donor. Do not flatten gear by host CP.
   if(input.controllerSnapshot.normalized.normalizationVersion===COOP_HOST_LEVEL_NORMALIZATION_VERSION||!ally.echo||!preferred.has(ally.echo.profileId))return base;
   const donorBoost=regionalCombatPowerBoost(input.expeditionId,ally.snapshot.combatPower,regionalEnabled);
   return scaleSocialEchoToHost(base,input.controllerSnapshot.combatPower,ally.snapshot.combatPower,hostBoost,donorBoost);
  })];
  return this.createRun({requestId:input.requestId,runId:input.runId,controllerAccountId:input.controllerAccountId,expeditionId:input.expeditionId,tier:input.tier,contentVersion:input.contentVersion,balanceVersion:input.balanceVersion,players,qmodePressureVersion:1,echoSourceAccountIds:allies.filter(ally=>ally.kind==='echo').map(ally=>ally.snapshot.accountId),npcCharacterIds:allies.filter(ally=>ally.kind==='npc').map(ally=>ally.snapshot.characterId)});
 }
 createLive(input:{requestId:string;runId:string;controllerAccountId:string;expeditionId:string;tier:1|2|3|4|5;contentVersion:string;balanceVersion:string;snapshots:readonly FrozenLoadoutSnapshot[]}):QModeRun{
  const definition=EXPEDITIONS[input.expeditionId];if(!definition)throw new Error('unknown_expedition');if(!definition.coopImplemented)throw new Error('expedition_not_implemented');
  if(input.snapshots.length!==4)throw new Error('invalid_live_roster');
  const requiredLevel=regularDungeonTierRequiredLevel(definition,input.tier);
  for(const snapshot of input.snapshots)if((snapshot.characterLevel??snapshot.normalized.before.level)<requiredLevel)throw new Error(`character_below_tier_level:${snapshot.characterId}`);
  if(input.balanceVersion===REGIONAL_DUNGEON_BALANCE_VERSION)for(const snapshot of input.snapshots)if(!Number.isFinite(snapshot.combatPower)||snapshot.combatPower!<regularDungeonTierRequiredPower(definition,input.tier))throw new Error('dungeon_power_requirement');
  validateCoopRoster(input.snapshots.map(snapshot=>({accountId:snapshot.accountId,characterId:snapshot.characterId,role:snapshot.readiness.role})));
  validateUniqueDamageClasses(input.snapshots.map(snapshot=>({role:snapshot.readiness.role,classId:snapshot.classId})));
  return this.createRun({requestId:input.requestId,runId:input.runId,controllerAccountId:input.controllerAccountId,expeditionId:input.expeditionId,tier:input.tier,contentVersion:input.contentVersion,balanceVersion:input.balanceVersion,players:input.snapshots.map(snapshot=>regionalCombatant(snapshot,input.expeditionId,input.balanceVersion)),echoSourceAccountIds:[]});
 }
 getAuthorized(runId:string,accountId:string):QModeRun{const run=this.repository.get(runId);if(!run)throw new Error('run_not_found');if(run.controllerAccountId!==accountId)throw new Error('not_participant');return run;}
 choose(input:{runId:string;controllerAccountId:string;optionNodeId:string;boonId?:string;safetyAiPlayerIds?:readonly string[]}):QModeRun{
  const run=this.getAuthorized(input.runId,input.controllerAccountId);if(run.phase!=='awaiting_choice')throw new Error('run_not_awaiting_choice');
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current||!current.nextNodeIds.includes(input.optionNodeId))throw new Error('invalid_option');
  const selected=run.graph.nodes.find(node=>node.nodeId===input.optionNodeId);if(!selected)throw new Error('invalid_option');
  const offers=roomBoonOffers(run,this.serverSecret);
  const artifactOffers=roomArtifactOffers(run,this.serverSecret);
  if(offers.length){
   // Older supported clients cannot submit a boon choice yet. Choose the
   // first deterministic offer for them instead of blocking existing runs.
   const selectedBoon=input.boonId??offers[0].id;
   if(!offers.some(offer=>offer.id===selectedBoon))throw new Error('invalid_boon_choice');
   applyRoomBoon(run,selectedBoon as RoomBoonId);
  }else if(artifactOffers.length){
   // Reuse the optional selection field to keep older supported clients
   // compatible with a deterministic first-choice fallback.
   const selectedArtifact=input.boonId??artifactOffers[0].id;
   if(!artifactOffers.some(offer=>offer.id===selectedArtifact))throw new Error('invalid_artifact_choice');
   applyRoomArtifact(run,selectedArtifact as DungeonArtifactId);
  }else if(input.boonId)throw new Error('invalid_boon_choice');
  const isCombat=selected.kind==='battle'||selected.kind==='elite'||selected.kind==='boss';
  const regional=regionalPowerMultipliers(run.expeditionId,run.tier,run.regionalBalanceVersion===1,selected.contentId,run.rootboundT3CalibrationVersion);
  // The first Endurance boss is a baseline clear checkpoint at room 8;
  // only continued seven-room chapters add boss pressure. Regular rooms keep
  // the original per-room difficulty ramp. Solo and Live share this engine.
  const encounterDepth=run.enduranceRouteVersion===1&&selected.kind==='boss'
   ?Math.max(1,selected.depth-DUNGEON_ENDURANCE.checkpointInterval):selected.depth;
  const depth=dungeonEncounterDepthMultipliers(encounterDepth,run.enduranceRouteVersion===1,selected.kind==='boss',run.bossEnduranceVersion);
  const maxDurationMs=dungeonBossTimeLimitMs(selected.depth,run.enduranceRouteVersion===1,selected.kind==='boss',run.bossEnduranceVersion);
  // Solar's repeated 5,200-HP Ward disproportionately blocks the Hexweaver/
  // Knife Dancer pairing despite verified entry CP. Slow only that ability on
  // newly versioned regional Tier I runs; keep opening Ward, boss phases and all
  // historical saved-run combat unchanged. The full 2,400-run published roster
  // matrix must keep every composition above the existing 85% clear-rate floor.
  const bossTuning=run.regionalBalanceVersion===1&&run.tier===1&&selected.contentId==='BOSS_EXP_SOLAR'
   ?{profileId:'sunscar-regional-solar-ward-cadence-v1',abilityCooldownMultipliers:{BOSS_EXP_SOLAR_WARD:3}}
   :undefined;
  const result=resolveCoopNode({runId:run.id,serverSecret:this.serverSecret,node:selected,players:isCombat?preparedCoopCombatants(run.players,run.persistentState.preparedAlchemyPotionIdsByActor):run.players,state:run.persistentState,tier:run.tierScalingVersion===2?run.tier:undefined,enemyAttackMultiplier:(run.qmodePressureVersion===1?1.005:1)*(regional?.attack??1)*depth.attack,enemyHpMultiplier:(regional?.hp??1)*depth.hp,enemyDefenseMultiplier:(regional?.defense??1)*depth.defense,enemyLevel:regional?.enemyLevel,enemyDamageProfile:run.qmodePressureVersion===1?'qmode-v1':undefined,enduranceLootVersion:run.enduranceRouteVersion,campfireBalanceVersion:run.graph.generatorVersion?.endsWith('-endurance-v2')?2:undefined,deferArtifactChoice:run.enduranceRouteVersion===1&&run.qmodePressureVersion===1,bossTuning,maxDurationMs,safetyAiPlayerIds:input.safetyAiPlayerIds});
  run.lastResolution={nodeId:selected.nodeId,result:structuredClone(result)};
  run.persistentState=result.state;run.currentNodeId=selected.nodeId;
  if(!result.success)run.phase='failed';
  else if(selected.kind==='boss'){
   run.phase='completed';run.rewardMarks=marksForRun(frozenRunBaseMarks(run),run.tier,{cleared:true,routeProgress:1,reachedFinalBoss:true});
  }
  this.repository.save(run);return structuredClone(run);
 }
 purchaseMerchant(input:{runId:string;controllerAccountId:string;actorId:string;offerId:string}):QModeRun{
  const run=this.getAuthorized(input.runId,input.controllerAccountId);if(run.phase!=='awaiting_choice')throw new Error('run_not_awaiting_choice');
  const node=run.graph.nodes.find(item=>item.nodeId===run.currentNodeId);if(!node)throw new Error('run_node_not_found');
  const result=purchaseMerchantOffer({runId:run.id,node,actorId:input.actorId,offerId:input.offerId,state:run.persistentState,players:run.players});
  run.lastResolution={nodeId:node.nodeId,result:structuredClone(result)};run.persistentState=result.state;this.repository.save(run);return structuredClone(run);
 }
 private createRun(input:{requestId:string;runId:string;controllerAccountId:string;expeditionId:string;tier:1|2|3|4|5;contentVersion:string;balanceVersion:string;players:CombatantDefinition[];qmodePressureVersion?:1;echoSourceAccountIds:string[];npcCharacterIds?:string[]}):QModeRun{
  const endurance=input.balanceVersion===REGIONAL_DUNGEON_BALANCE_VERSION;
  const graph=generateCoopRouteGraph(this.serverSecret,input.expeditionId,input.runId,input.contentVersion,input.balanceVersion,endurance?'endurance':'legacy');
  const run:QModeRun={id:input.runId,requestId:input.requestId,controllerAccountId:input.controllerAccountId,expeditionId:input.expeditionId,tier:input.tier,rewardBaseMarks:currentDungeonBaseMarks(input.expeditionId),graph,currentNodeId:graph.entryNodeId,phase:'awaiting_choice',players:input.players,persistentState:initialPersistentRunState(input.players),...(endurance?{enduranceRouteVersion:1 as const,bossEnduranceVersion:DUNGEON_BOSS_ENDURANCE_VERSION}:{}),tierScalingVersion:2,...(input.balanceVersion===REGIONAL_DUNGEON_BALANCE_VERSION?{regionalBalanceVersion:1 as const}:{}),...(input.balanceVersion===REGIONAL_DUNGEON_BALANCE_VERSION&&input.qmodePressureVersion===1&&input.expeditionId==='EXP_001'&&input.tier===3?{rootboundT3CalibrationVersion:1 as const}:{}),qmodePressureVersion:input.qmodePressureVersion,echoSourceAccountIds:input.echoSourceAccountIds,npcCharacterIds:input.npcCharacterIds??[]};
  this.repository.save(run);return structuredClone(run);
 }
}
