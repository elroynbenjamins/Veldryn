import type {CoopRole,CoopRouteGraph,CoopRouteNode} from '../../shared/coop-types';
import {coopRouteClientProjection} from '../expeditions/route-generation';
import type {QModeRun} from './qmode';
import {projectCombatReplay,type PublicCombatReplay} from './combat-replay-projection';
import {expeditionBossTelegraph,expeditionEncounterPreview} from '../combat/expedition-combat-service';
import {roomBoonOffers,type RoomBoonOffer} from './room-boon-choices';
import {DUNGEON_ARTIFACTS,isDungeonArtifact} from './dungeon-artifacts';
import {ROOM_BOON_CHOICES} from './room-boon-choices';
import {roomArtifactOffers,type RoomArtifactOffer} from './room-artifact-choices';
import {availableDungeonCombatMarks,projectedDungeonCombatMarks,DUNGEON_COMBAT_MARKS_CAP} from './dungeon-combat-marks-cap';

// Static encounter intel is determined solely by the content ID; do not
// regenerate its combat catalog for every server projection or room update.
const encounterPreviewCache=new Map<string,ReturnType<typeof expeditionEncounterPreview>>();
const bossTelegraphCache=new Map<string,ReturnType<typeof expeditionBossTelegraph>>();
const cachedEncounterPreview=(id:string)=>{if(!encounterPreviewCache.has(id))encounterPreviewCache.set(id,expeditionEncounterPreview(id));return encounterPreviewCache.get(id)!;};
const cachedBossTelegraph=(id:string)=>{if(!bossTelegraphCache.has(id))bossTelegraphCache.set(id,expeditionBossTelegraph(id));return bossTelegraphCache.get(id);};

/** Never publish RNG rolls, hidden graph nodes, private state or account IDs in room feedback. */
export function publicCoopRoomOutcome(nodeId:string|undefined,summary:Record<string,unknown>|undefined){
 if(!nodeId||!summary)return undefined;
 const kind=summary.kind;
 if(typeof kind!=='string'||!['camp','shrine','forge','treasure','secret','event','risk','echo','merchant','merchant_purchase'].includes(kind))return undefined;
 const count=(key:string)=>typeof summary[key]==='number'&&Number.isFinite(summary[key])?Math.max(0,summary[key] as number):0;
 const delta=typeof summary.resourcesDelta==='number'&&Number.isFinite(summary.resourcesDelta)?summary.resourcesDelta:0;
 return {nodeId,kind,resourcesDelta:delta,healedHp:count('healedHp'),damagedHp:count('damagedHp'),revivedCount:count('revivedCount'),boonCount:count('boonCount'),artifactCount:count('artifactCount'),curseCount:count('curseCount'),...(kind==='merchant_purchase'&&typeof summary.offerKind==='string'?{offerKind:summary.offerKind}: {}),
  ...(typeof summary.artifactId==='string'&&isDungeonArtifact(summary.artifactId)?{artifactName:DUNGEON_ARTIFACTS[summary.artifactId].name}:{}),
  ...(typeof summary.boonId==='string'&&ROOM_BOON_CHOICES.some(boon=>boon.id===summary.boonId)?{boonName:ROOM_BOON_CHOICES.find(boon=>boon.id===summary.boonId)!.name}:{})};
}


export interface PublicQModeMember {memberId:string;displayName:string;role:CoopRole;classId:string;bodyPresentation?:'male'|'female';companionId?:string;kind:'controller'|'echo'|'npc';effectiveLevel:number;currentHp:number;maximumHp:number;downed:boolean;}
export interface PublicQModeRunProjection {
  runId:string;mode:'qmode'|'live';phase:QModeRun['phase'];tier:QModeRun['tier'];expeditionId:string;
  controller:true;team:PublicQModeMember[];graph:CoopRouteGraph;currentNodeId:string;
  options:CoopRouteNode[];visitedNodeIds:string[];resources:number;boons:string[];artifacts:string[];curses:string[];personalEffects:Record<string,{boons:string[];artifacts:string[];purchases:string[]}>;
  settlement:{status:'not_ready'|'pending_entitlement'};
  bossMechanic?:{label:string;summary:string;tone:'benefit'|'mixed'|'danger';telegraph:{bossName:string;phases:Array<{id:string;label:string;hpPct:number;objectiveSensitive:false}>;castAbilities:Array<{id:string;label:string;castMs:number;cooldownMs:number;interruptible:boolean;objectiveSensitive:false}>;suppressedAbilities:Array<{id:string;label:string}>}};
  lastCombat?:PublicCombatReplay;
  lastRoomOutcome?:ReturnType<typeof publicCoopRoomOutcome>;
  lastCombatMarks?:number;combatMarksEarned?:number;combatMarksCap?:number;
  boonOffers?:RoomBoonOffer[];artifactOffers?:RoomArtifactOffer[];
  runBuild?:{boons:Array<{id:string;name:string;description:string;stacks:number}>;artifacts:Array<{id:string;name:string;description:string;stacks:number}>};
  potionChargeCapacity?:number;healingPotionUsesByActor?:Record<string,number>;
  potionPreparationOpen?:boolean;preparedAlchemyPotionIdsByActor?:Record<string,string>;
}

/** Sanitizes the server-owned run for its controller. Echo source account IDs,
 * hidden graph nodes, RNG state and calculated-but-unentitled rewards stay private. */
export function projectQModeRun(run:QModeRun,mode:'qmode'|'live'='qmode',serverSecret?:string):PublicQModeRunProjection{
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current)throw new Error('invalid_qmode_current_node');
  const currentNode=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);
   const bossNode=currentNode?.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)).find(node=>node?.kind==='boss');
  const revealed=[run.graph.entryNodeId,...run.persistentState.visitedNodeIds,run.currentNodeId];
  const graph=coopRouteClientProjection(run.graph,revealed);
  const visible=new Set(graph.nodes.map(node=>node.nodeId));
  // A regional boss roll remains a surprise until the final room is reachable.
  // Otherwise this private telegraph would reveal the 50/50 result on entry.
  const bossTelegraph=bossNode&&visible.has(bossNode.nodeId)?cachedBossTelegraph(bossNode.contentId):undefined;
  const options=run.phase==='awaiting_choice'?current.nextNodeIds.filter(id=>visible.has(id)).map(id=>graph.nodes.find(node=>node.nodeId===id)!).filter(Boolean).map(node=>({...node,...(['battle','elite','boss'].includes(node.kind)?{encounterPreview:cachedEncounterPreview(node.contentId)}:{})})):[];
  const lastRoomOutcome=publicCoopRoomOutcome(run.lastResolution?.nodeId,run.lastResolution?.result.summary);
  const boonOffers=mode==='qmode'&&serverSecret?roomBoonOffers(run,serverSecret):[];
  const artifactOffers=mode==='qmode'&&serverSecret?roomArtifactOffers(run,serverSecret):[];
  const runBuild=run.enduranceRouteVersion===1?{
   boons:ROOM_BOON_CHOICES.filter(choice=>run.persistentState.boons.includes(choice.id)).map(choice=>({id:choice.id,name:choice.name,description:choice.description,stacks:run.persistentState.boons.filter(id=>id===choice.id).length})),
   artifacts:(Object.entries(DUNGEON_ARTIFACTS) as Array<[keyof typeof DUNGEON_ARTIFACTS,(typeof DUNGEON_ARTIFACTS)[keyof typeof DUNGEON_ARTIFACTS]]>).filter(([id])=>run.persistentState.artifacts.includes(id)).map(([id,definition])=>({id,name:definition.name,description:definition.description,stacks:run.persistentState.artifacts.filter(item=>item===id).length})),
  }:undefined;
  const resolvedNode=run.graph.nodes.find(node=>node.nodeId===run.lastResolution?.nodeId);
  const visitedCombatKinds=run.persistentState.visitedNodeIds
   .filter(id=>run.lastResolution?.result.success!==false||id!==run.lastResolution?.nodeId)
   .map(id=>run.graph.nodes.find(node=>node.nodeId===id)?.kind??'other');
  const cappedRun=run.enduranceRouteVersion===1;
  const combatMarksEarned=cappedRun?projectedDungeonCombatMarks(visitedCombatKinds):undefined;
  const lastCombatBase=resolvedNode&&(resolvedNode.kind==='elite'||resolvedNode.kind==='battle')?resolvedNode.kind:undefined;
  const previouslyEarned=cappedRun&&lastCombatBase&&run.lastResolution?.result.success
   ?projectedDungeonCombatMarks(visitedCombatKinds.slice(0,-1)):0;
  const lastCombatMarks=lastCombatBase&&run.lastResolution?.result.success
   ?cappedRun?availableDungeonCombatMarks(previouslyEarned,lastCombatBase):lastCombatBase==='elite'?5:3:undefined;
  const team=run.players.map((player,index):PublicQModeMember=>{const state=run.persistentState.actors[player.id];if(!state)throw new Error('missing_qmode_actor_state');const companionId=(player.tags??[]).find(tag=>tag.startsWith('companion:'))?.slice('companion:'.length),bodyTag=(player.tags??[]).find(tag=>tag.startsWith('body:'))?.slice('body:'.length),bodyPresentation=bodyTag==='female'?'female' as const:bodyTag==='male'?'male' as const:undefined;return{memberId:player.id,displayName:player.name,role:player.role as CoopRole,classId:player.classId??'',bodyPresentation,companionId,kind:index===0?'controller':run.npcCharacterIds?.includes(player.id)?'npc':'echo',effectiveLevel:player.level,currentHp:state.hp,maximumHp:player.stats.maxHp,downed:state.downed};});
  return {runId:run.id,mode,phase:run.phase,tier:run.tier,expeditionId:run.expeditionId,controller:true,team:mode==='live'?team.map(member=>({...member,kind:'controller' as const})):team,graph,currentNodeId:run.currentNodeId,options,visitedNodeIds:[...run.persistentState.visitedNodeIds],resources:run.persistentState.resources,boons:[...run.persistentState.boons],artifacts:[...run.persistentState.artifacts],curses:[...run.persistentState.curses],personalEffects:run.persistentState.personalEffects,potionChargeCapacity:([3,3,4,4,5] as const)[run.tier-1],healingPotionUsesByActor:run.persistentState.healingPotionUsesByActor??{},potionPreparationOpen:run.phase==='awaiting_choice'&&!run.persistentState.visitedNodeIds.length,preparedAlchemyPotionIdsByActor:run.persistentState.preparedAlchemyPotionIdsByActor??{},...(bossTelegraph?{bossMechanic:{label:'Dungeon boss mechanics',summary:'3:00 combat limit. Defeat the boss before time expires; surviving alone is not enough.',tone:'mixed' as const,telegraph:bossTelegraph}}:{}),lastCombat:projectCombatReplay(run.lastResolution),...(boonOffers.length?{boonOffers}:{}),...(artifactOffers.length?{artifactOffers}:{}),...(run.enduranceRouteVersion===1?{runBuild}:{}),...(lastRoomOutcome?{lastRoomOutcome}:{}),...(lastCombatMarks?{lastCombatMarks}:{}),...(cappedRun?{combatMarksEarned,combatMarksCap:DUNGEON_COMBAT_MARKS_CAP}:{}),settlement:{status:(run.phase==='completed'||run.phase==='failed')?'pending_entitlement':'not_ready'}};
}
