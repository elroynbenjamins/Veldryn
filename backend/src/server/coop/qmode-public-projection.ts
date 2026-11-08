import type {CoopRole,CoopRouteGraph,CoopRouteNode} from '../../shared/coop-types';
import {coopRouteClientProjection} from '../expeditions/route-generation';
import {merchantOffers} from '../expeditions/node-resolution';
import type {QModeRun} from './qmode';
import {projectCombatReplay,type PublicCombatReplay} from './combat-replay-projection';
import {expeditionBossTelegraph,expeditionEncounterPreview} from '../combat/expedition-combat-service';
import {roomBoonOffers,type RoomBoonOffer} from './room-boon-choices';

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
 return {nodeId,kind,resourcesDelta:delta,healedHp:count('healedHp'),damagedHp:count('damagedHp'),revivedCount:count('revivedCount'),boonCount:count('boonCount'),artifactCount:count('artifactCount'),curseCount:count('curseCount'),...(kind==='merchant_purchase'&&typeof summary.offerKind==='string'?{offerKind:summary.offerKind}: {})};
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
  merchantShop?:{resources:number;offers:Array<{id:string;kind:'boon'|'artifact'|'salve';cost:number;purchased:boolean}>};
  boonOffers?:RoomBoonOffer[];
  potionChargeCapacity?:number;healingPotionUsesByActor?:Record<string,number>;
  potionPreparationOpen?:boolean;preparedAlchemyPotionIdsByActor?:Record<string,string>;
}

/** Sanitizes the server-owned run for its controller. Echo source account IDs,
 * hidden graph nodes, RNG state and calculated-but-unentitled rewards stay private. */
export function projectQModeRun(run:QModeRun,mode:'qmode'|'live'='qmode',serverSecret?:string):PublicQModeRunProjection{
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current)throw new Error('invalid_qmode_current_node');
  const bossNode=run.graph.nodes.find(node=>node.kind==='boss'),bossTelegraph=bossNode?cachedBossTelegraph(bossNode.contentId):undefined;
  const revealed=[run.graph.entryNodeId,...run.persistentState.visitedNodeIds,run.currentNodeId];
  const graph=coopRouteClientProjection(run.graph,revealed);
  const visible=new Set(graph.nodes.map(node=>node.nodeId));
  const options=run.phase==='awaiting_choice'?current.nextNodeIds.filter(id=>visible.has(id)).map(id=>graph.nodes.find(node=>node.nodeId===id)!).filter(Boolean).map(node=>({...node,...(['battle','elite','boss'].includes(node.kind)?{encounterPreview:cachedEncounterPreview(node.contentId)}:{})})):[];
  const lastRoomOutcome=publicCoopRoomOutcome(run.lastResolution?.nodeId,run.lastResolution?.result.summary);
  const boonOffers=mode==='qmode'&&serverSecret?roomBoonOffers(run,serverSecret):[];
  const merchantShop=mode==='qmode'&&run.phase==='awaiting_choice'&&current.kind==='merchant'&&run.persistentState.visitedNodeIds.includes(current.nodeId)?{
   resources:run.persistentState.resources,
   offers:merchantOffers(current.contentId).map(offer=>({id:offer.id,kind:offer.kind,cost:offer.cost,purchased:(run.persistentState.personalEffects[run.players[0].id]?.purchases??[]).includes(offer.id)}))
  }:undefined;
  const team=run.players.map((player,index):PublicQModeMember=>{const state=run.persistentState.actors[player.id];if(!state)throw new Error('missing_qmode_actor_state');const companionId=(player.tags??[]).find(tag=>tag.startsWith('companion:'))?.slice('companion:'.length),bodyTag=(player.tags??[]).find(tag=>tag.startsWith('body:'))?.slice('body:'.length),bodyPresentation=bodyTag==='female'?'female' as const:bodyTag==='male'?'male' as const:undefined;return{memberId:player.id,displayName:player.name,role:player.role as CoopRole,classId:player.classId??'',bodyPresentation,companionId,kind:index===0?'controller':run.npcCharacterIds?.includes(player.id)?'npc':'echo',effectiveLevel:player.level,currentHp:state.hp,maximumHp:player.stats.maxHp,downed:state.downed};});
  return {runId:run.id,mode,phase:run.phase,tier:run.tier,expeditionId:run.expeditionId,controller:true,team:mode==='live'?team.map(member=>({...member,kind:'controller' as const})):team,graph,currentNodeId:run.currentNodeId,options,visitedNodeIds:[...run.persistentState.visitedNodeIds],resources:run.persistentState.resources,boons:[...run.persistentState.boons],artifacts:[...run.persistentState.artifacts],curses:[...run.persistentState.curses],personalEffects:run.persistentState.personalEffects,potionChargeCapacity:([3,3,4,4,5] as const)[run.tier-1],healingPotionUsesByActor:run.persistentState.healingPotionUsesByActor??{},potionPreparationOpen:run.phase==='awaiting_choice'&&!run.persistentState.visitedNodeIds.length,preparedAlchemyPotionIdsByActor:run.persistentState.preparedAlchemyPotionIdsByActor??{},...(bossTelegraph?{bossMechanic:{label:'Dungeon boss mechanics',summary:'Read the cast telegraphs and interrupt dangerous abilities before the final phase.',tone:'mixed' as const,telegraph:bossTelegraph}}:{}),lastCombat:projectCombatReplay(run.lastResolution),...(boonOffers.length?{boonOffers}:{}),...(lastRoomOutcome?{lastRoomOutcome}:{}),...(merchantShop?{merchantShop}:{}),settlement:{status:(run.phase==='completed'||run.phase==='failed')?'pending_entitlement':'not_ready'}};
}
