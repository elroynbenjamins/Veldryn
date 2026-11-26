import type { ExpeditionNodeType } from '../../shared/expedition-types';
import { EXPEDITIONS } from './content/launch-content';
import {dungeonBossVariantsFor} from './content/dungeon-boss-rotation';
import { deterministicInt, deterministicUnit } from './rng';
import type { CoopRouteGraph, CoopRouteNode } from '../../shared/coop-types';
import { COOP_ROGUELITE_CONFIG } from '../coop/config';
import { validatePreBossNodeCount } from '../coop/invariants';
import {coopContentPool} from './content/coop-route-content';

export interface RouteNode { index: number; type: ExpeditionNodeType; depth: number; risk: number; }

function weightedNode(secret: string, expeditionId: string, index: number): ExpeditionNodeType {
  const def = EXPEDITIONS[expeditionId];
  if (!def) throw new Error('unknown_expedition');
  const entries = (Object.entries(def.nodeWeights) as Array<[ExpeditionNodeType, number]>).filter(([kind]) => kind !== 'merchant');
  const total = entries.reduce((s,[,w]) => s + w, 0);
  let roll = deterministicUnit(secret, expeditionId, 'node', index) * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return 'battle';
}

export function generateRoute(secret: string, expeditionId: string, runId: string): RouteNode[] {
  const def = EXPEDITIONS[expeditionId];
  if (!def) throw new Error('unknown_expedition');
  const count = deterministicInt(secret, def.minNodes, def.maxNodes, runId, expeditionId, 'length');
  const nodes: RouteNode[] = [];
  for (let i=0;i<count;i++) {
    let type: ExpeditionNodeType = weightedNode(secret, expeditionId, i);
    if (i === 0 && ['boss','secret','forge'].includes(type)) type = 'battle';
    if (i === count - 1) type = 'boss';
    nodes.push({ index:i, type, depth:i, risk:type === 'risk' ? 1.15 : type === 'elite' ? 1.08 : 1.0 });
  }
  return nodes;
}

const MODIFIERS = ['steady','thorned','volatile','warded','swift','attrition'] as const;

// These are reward categories, not strictly node kinds: Forge and Echo also
// grant boons, while Secret rooms grant artifacts. Different categories may
// coexist in one three-choice layer; only repeats within a category are banned.
type SpecialRoomCategory='boon'|'artifact'|'campfire';
function specialRoomCategory(kind:ExpeditionNodeType|'entry'):SpecialRoomCategory|undefined{
 if(kind==='shrine'||kind==='forge'||kind==='echo')return 'boon';
 if(kind==='treasure'||kind==='secret')return 'artifact';
 if(kind==='camp')return 'campfire';
 return undefined;
}

/** Re-roll only a conflicting special room, preserving the original seeded
 * choices (and combat pacing) wherever there is no category collision. */
function distinctSpecialRoomKind(secret:string,expeditionId:string,runId:string,contentVersion:string,balanceVersion:string,depth:number,choice:number,excluded:SpecialRoomCategory):Exclude<ExpeditionNodeType,'boss'>{
 const def=EXPEDITIONS[expeditionId];
 const entries=(Object.entries(def.nodeWeights) as Array<[ExpeditionNodeType,number]>)
  .filter(([kind,weight])=>kind!=='boss'&&kind!=='merchant'&&kind!=='event'&&weight>0&&specialRoomCategory(kind)!==excluded);
 const total=entries.reduce((sum,[,weight])=>sum+weight,0);
 if(total<=0)return 'battle';
 let roll=deterministicUnit(secret,'coop-unique-special-v1',runId,expeditionId,contentVersion,balanceVersion,depth,choice,excluded)*total;
 for(const [kind,weight] of entries){roll-=weight;if(roll<=0)return kind as Exclude<ExpeditionNodeType,'boss'>;}
 return 'battle';
}

function coopKind(secret:string, expeditionId:string, runId:string, contentVersion:string, balanceVersion:string, depth:number, choice:number):Exclude<ExpeditionNodeType,'boss'> {
  // The opening remains a full combat encounter, but the second stage now
  // offers a genuine utility route alongside two distinct enemy formations.
  // Keep the first two battle options to preserve dungeon combat pacing.
  if (depth === 1) return 'battle';
  if (depth === 2) {
    if (choice < 2) return 'battle';
    // Resource-only Event Rooms no longer offer a meaningful choice: merchant rooms
    // are absent from new routes, so their temporary supplies cannot be spent.
    // Keep the legacy event resolver for saved in-progress dungeon graphs.
    const utility=['treasure','camp','shrine'] as const;
    return utility[deterministicInt(secret,0,utility.length-1,'coop-route-opening-v2',runId,expeditionId,contentVersion,balanceVersion)];
  }
  if (choice === 0) return 'battle';
  if (depth === 3 && choice === 1) return 'camp';
  const def=EXPEDITIONS[expeditionId];
  const entries=(Object.entries(def.nodeWeights) as Array<[ExpeditionNodeType,number]>).filter(([kind])=>kind!=='boss'&&kind!=='merchant'&&kind!=='event');
  const total=entries.reduce((sum,[,weight])=>sum+weight,0);
  let roll=deterministicUnit(secret,'coop-route-v1',runId,expeditionId,contentVersion,balanceVersion,'kind',depth,choice)*total;
  for(const [kind,weight] of entries){roll-=weight;if(roll<=0)return kind as Exclude<ExpeditionNodeType,'boss'>;}
  return 'battle';
}

/** One matchmaking queue and one path. At every seven cleared rooms players
 * can finish at the boss, or choose recovery / a boon to continue. */
export const DUNGEON_ENDURANCE=Object.freeze({checkpointInterval:7,maxNormalRooms:42,version:1});

export function generateCoopRouteGraph(secret:string,expeditionId:string,runId:string,contentVersion:string,balanceVersion:string,routeMode:'legacy'|'endurance'|'endurance-v1'='legacy'):CoopRouteGraph {
 const def=EXPEDITIONS[expeditionId];if(!def)throw new Error('unknown_expedition');
 if(!def.coopImplemented)throw new Error('expedition_not_implemented');
 const isEndurance=routeMode!=='legacy';
 // Preserve saved v1 graphs; all newly generated Endurance runs use the checkpoint-choice v2 layout.
 const checkpointChoiceV2=routeMode==='endurance';
 const baseGeneratorVersion=isEndurance?COOP_ROGUELITE_CONFIG.routeGeneratorVersion+(checkpointChoiceV2?'-endurance-v2':'-endurance-v1'):COOP_ROGUELITE_CONFIG.routeGeneratorVersion;
 // Version the new rule so already-frozen historical route graphs (including
 // Endurance v1/v2) remain valid. The old RNG seed remains stable except when
 // a duplicate special category must be replaced.
 const distinctSpecialChoices=routeMode!=='endurance-v1';
 const generatorVersion=distinctSpecialChoices?isEndurance?COOP_ROGUELITE_CONFIG.routeGeneratorVersion+'-unique-special-v1-endurance-v2':baseGeneratorVersion+'-unique-special-v1':baseGeneratorVersion;
 const regularRoomSeedVersion=checkpointChoiceV2?COOP_ROGUELITE_CONFIG.routeGeneratorVersion+'-endurance-v1':baseGeneratorVersion;
 const preBossNodeCount=isEndurance?DUNGEON_ENDURANCE.maxNormalRooms:deterministicInt(secret,COOP_ROGUELITE_CONFIG.preBossNodeMin,COOP_ROGUELITE_CONFIG.preBossNodeMax,baseGeneratorVersion,runId,expeditionId,contentVersion,balanceVersion,'length');
 const finalBosses=dungeonBossVariantsFor(expeditionId);
 // One frozen 50/50 boss roll per run: players cannot reroll a boss by
 // choosing to continue or reconnecting.
 const bossId=finalBosses.length?finalBosses[deterministicInt(secret,0,finalBosses.length-1,'regional-boss-v1',runId,expeditionId,contentVersion,balanceVersion)].bossId:def.bossId;
 const nodes:CoopRouteNode[]=[];
 const idsAt=(depth:number)=>Array.from({length:COOP_ROGUELITE_CONFIG.choicesPerDepth},(_,choice)=>`d${depth}-c${choice}`);
 nodes.push({nodeId:'entry',depth:0,kind:'entry',contentId:'COOP_ENTRY',modifierId:'none',risk:1,rewardTag:'none',nextNodeIds:idsAt(1)});
 for(let depth=1;depth<=preBossNodeCount;depth++){
   const layerModifierOffset=deterministicInt(secret,0,MODIFIERS.length-1,regularRoomSeedVersion,runId,expeditionId,contentVersion,balanceVersion,'modifier-layer',depth);
   const checkpoint=isEndurance&&depth>1&&(depth-1)%DUNGEON_ENDURANCE.checkpointInterval===0;
   const usedContentIds=new Set<string>();
   const usedSpecialCategories=new Set<SpecialRoomCategory>();
   for(let choice=0;choice<COOP_ROGUELITE_CONFIG.choicesPerDepth;choice++){
     if(checkpoint&&choice===2){
       nodes.push({nodeId:`d${depth}-c${choice}`,depth,kind:'boss',contentId:bossId,modifierId:'checkpoint',risk:1.25,rewardTag:'boss',nextNodeIds:[]});
       continue;
     }
     if(checkpoint&&checkpointChoiceV2){
       // Recovery and a boon are alternatives to the boss, never mandatory pre-boss stops.
       const kind=choice===0?'camp':'shrine';
       const pool=coopContentPool(expeditionId,kind);
       const index=deterministicInt(secret,0,pool.length-1,baseGeneratorVersion,runId,expeditionId,contentVersion,balanceVersion,'checkpoint-choice',depth,kind);
       nodes.push({nodeId:`d${depth}-c${choice}`,depth,kind,contentId:pool[index],modifierId:kind==='camp'?'checkpoint-camp-v2':'checkpoint-boon-v2',risk:1,rewardTag:kind==='camp'?'camp':'boon',nextNodeIds:idsAt(depth+1)});
       continue;
     }
     let kind=coopKind(secret,expeditionId,runId,contentVersion,balanceVersion,depth,choice);
     const category=specialRoomCategory(kind);
     if(distinctSpecialChoices&&category&&usedSpecialCategories.has(category)){
       kind=distinctSpecialRoomKind(secret,expeditionId,runId,contentVersion,balanceVersion,depth,choice,category);
     }
     const chosenCategory=specialRoomCategory(kind);
     if(chosenCategory)usedSpecialCategories.add(chosenCategory);
     const contentPool=coopContentPool(expeditionId,kind);
     let contentIndex=deterministicInt(secret,0,contentPool.length-1,regularRoomSeedVersion,runId,expeditionId,contentVersion,balanceVersion,'content',depth,choice);
     while(usedContentIds.has(contentPool[contentIndex]))contentIndex=(contentIndex+1)%contentPool.length;
     const contentId=contentPool[contentIndex];usedContentIds.add(contentId);
     const modifierIndex=(layerModifierOffset+choice)%MODIFIERS.length;
     nodes.push({nodeId:`d${depth}-c${choice}`,depth,kind,contentId,modifierId:kind==='elite'?MODIFIERS[modifierIndex]:'steady',risk:kind==='risk'?1.15:kind==='elite'?1.08:1,rewardTag:kind,nextNodeIds:depth===preBossNodeCount?['boss']:idsAt(depth+1)});
   }
 }
 // Safety ceiling is deliberately bounded: deeper scoreboards can be added
 // without exposing unbounded run size or unbounded boon progression.
 nodes.push({nodeId:'boss',depth:preBossNodeCount+1,kind:'boss',contentId:bossId,modifierId:'final',risk:1.25,rewardTag:'boss',nextNodeIds:[]});
 const graph:CoopRouteGraph={schemaVersion:1,generatorVersion,runId,expeditionId,contentVersion,balanceVersion,preBossNodeCount,entryNodeId:'entry',bossNodeId:'boss',nodes};
 validateCoopRouteGraph(graph);
 return graph;
}

export function validateCoopRouteGraph(graph:CoopRouteGraph,limits?:{preBossNodeMin:number;preBossNodeMax:number}):void {
 const enduranceV2=graph.generatorVersion.endsWith('-endurance-v2');
 const endurance=enduranceV2||graph.generatorVersion.endsWith('-endurance-v1');
 if(limits){
   if(!Number.isInteger(graph.preBossNodeCount)||graph.preBossNodeCount<limits.preBossNodeMin||graph.preBossNodeCount>limits.preBossNodeMax)throw new Error('invalid_coop_route_length');
 }else if(endurance){
   if(graph.preBossNodeCount!==DUNGEON_ENDURANCE.maxNormalRooms)throw new Error('invalid_endurance_route_length');
 }else validatePreBossNodeCount(graph.preBossNodeCount);
 const byId=new Map(graph.nodes.map(node=>[node.nodeId,node]));
 if(byId.size!==graph.nodes.length)throw new Error('duplicate_route_node');
 const entry=byId.get(graph.entryNodeId),finalBoss=byId.get(graph.bossNodeId);
 if(!entry||entry.kind!=='entry'||entry.depth!==0)throw new Error('invalid_route_entry');
 if(!finalBoss||finalBoss.kind!=='boss'||finalBoss.depth!==graph.preBossNodeCount+1||finalBoss.nextNodeIds.length)throw new Error('invalid_route_boss');
 const visiting=new Set<string>(),visited=new Set<string>(),bossIds=new Set<string>();
 const visit=(id:string,nonBossCount:number):void=>{
   const node=byId.get(id);if(!node)throw new Error('missing_route_reference');
   if(visiting.has(id))throw new Error('cyclic_route');
   if(visited.has(id)||bossIds.has(id))return;
   if(node.kind==='boss'){
     const isFinal=id===graph.bossNodeId;
     if(node.nextNodeIds.length||(isFinal ? nonBossCount!==graph.preBossNodeCount : (!endurance||nonBossCount===0||nonBossCount%DUNGEON_ENDURANCE.checkpointInterval!==0||node.depth!==nonBossCount+1||node.contentId!==finalBoss.contentId)))throw new Error('invalid_route_path_length');
     bossIds.add(id);return;
   }
   visiting.add(id);
   if(node.kind!=='entry')nonBossCount++;
   if(node.nextNodeIds.length<3&&node.depth<graph.preBossNodeCount)throw new Error('insufficient_route_choices');
   if(node.nextNodeIds.length>=3){
     const children=node.nextNodeIds.map(next=>byId.get(next));
     if(children.some(child=>!child))throw new Error('missing_route_reference');
     if(new Set(children.map(child=>`${child!.contentId}:${child!.modifierId}`)).size<3)throw new Error('fake_route_branching');
   }
   for(const nextId of node.nextNodeIds){
     const child=byId.get(nextId);if(!child)throw new Error('missing_route_reference');
     if(child.depth!==node.depth+1)throw new Error('route_depth_skip');
     visit(nextId,nonBossCount);
   }
   visiting.delete(id);visited.add(id);
 };
 visit(graph.entryNodeId,0);
 if(visited.size+bossIds.size!==graph.nodes.length)throw new Error('unreachable_route_node');
 for(let depth=1;depth<=graph.preBossNodeCount;depth++){
   const layer=graph.nodes.filter(node=>node.depth===depth);
   if(layer.length!==3)throw new Error('insufficient_route_layer');
   if(depth===1&&layer.some(node=>node.kind!=='battle'))throw new Error('mandatory_combat_missing');
   if(depth===2&&layer.filter(node=>node.kind==='battle').length<2)throw new Error('opening_combat_missing');
   if(depth>2&&!layer.some(node=>node.kind==='battle')&&!(enduranceV2&&layer.some(node=>node.kind==='boss')))throw new Error('combat_option_missing');
   // Do not invalidate older already-authenticated dungeon graphs: only
   // graphs stamped with the new generator revision must obey this rule.
   if(graph.generatorVersion.includes('-unique-special-v1')){
     const categories=layer.map(node=>specialRoomCategory(node.kind)).filter((category):category is SpecialRoomCategory=>category!==undefined);
     if(new Set(categories).size!==categories.length)throw new Error('duplicate_special_room_choice');
   }
   if(endurance&&depth>1&&(depth-1)%DUNGEON_ENDURANCE.checkpointInterval===0){
     if(layer.filter(node=>node.kind==='boss').length!==1||layer.filter(node=>node.kind!=='boss').length!==2)throw new Error('checkpoint_choices_invalid');
     if(enduranceV2&&(layer[0].kind!=='camp'||layer[0].modifierId!=='checkpoint-camp-v2'||layer[1].kind!=='shrine'||layer[1].modifierId!=='checkpoint-boon-v2'||layer[2].kind!=='boss'))throw new Error('checkpoint_recovery_boon_choices_invalid');
   }else if(layer.some(node=>node.kind==='boss'))throw new Error('unexpected_checkpoint');
 }
 if(!graph.nodes.some(node=>node.kind==='camp'||node.kind==='shrine'))throw new Error('recovery_option_missing');
}

export function coopRouteClientProjection(graph:CoopRouteGraph,revealedNodeIds:readonly string[]=[graph.entryNodeId]):CoopRouteGraph {
  const byId=new Map(graph.nodes.map(node=>[node.nodeId,node]));const visible=new Set(revealedNodeIds);
  for(const id of revealedNodeIds)for(const next of byId.get(id)?.nextNodeIds??[])visible.add(next);
  // Only visible nodes may cross the projection boundary. Copy the public
  // scalars and revealed nodes once; cloning the full hidden graph first was
  // redundant and became expensive on each room transition.
  return {...graph,nodes:graph.nodes.filter(node=>visible.has(node.nodeId)).map(node=>structuredClone(node))};
}
