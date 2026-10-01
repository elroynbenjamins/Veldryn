import type {CoopRole,CoopRouteGraph,CoopRouteNode} from '../../shared/coop-types';
import {coopRouteClientProjection} from '../expeditions/route-generation';
import type {QModeRun} from './qmode';
import {projectCombatReplay,type PublicCombatReplay} from './combat-replay-projection';
import {expeditionBossTelegraph,expeditionEncounterPreview} from '../combat/expedition-combat-service';

export interface PublicQModeMember {memberId:string;displayName:string;role:CoopRole;classId:string;bodyPresentation?:'male'|'female';companionId?:string;kind:'controller'|'echo';effectiveLevel:number;currentHp:number;maximumHp:number;downed:boolean;}
export interface PublicQModeRunProjection {
  runId:string;mode:'qmode'|'live';phase:QModeRun['phase'];tier:QModeRun['tier'];expeditionId:string;
  controller:true;team:PublicQModeMember[];graph:CoopRouteGraph;currentNodeId:string;
  options:CoopRouteNode[];visitedNodeIds:string[];resources:number;boons:string[];artifacts:string[];curses:string[];personalEffects:Record<string,{boons:string[];artifacts:string[];purchases:string[]}>;
  settlement:{status:'not_ready'|'pending_entitlement'};
  bossMechanic?:{label:string;summary:string;tone:'benefit'|'mixed'|'danger';telegraph:{bossName:string;phases:Array<{id:string;label:string;hpPct:number;objectiveSensitive:false}>;castAbilities:Array<{id:string;label:string;castMs:number;cooldownMs:number;interruptible:boolean;objectiveSensitive:false}>;suppressedAbilities:Array<{id:string;label:string}>}};
  lastCombat?:PublicCombatReplay;
}

/** Sanitizes the server-owned run for its controller. Echo source account IDs,
 * hidden graph nodes, RNG state and calculated-but-unentitled rewards stay private. */
export function projectQModeRun(run:QModeRun,mode:'qmode'|'live'='qmode'):PublicQModeRunProjection{
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current)throw new Error('invalid_qmode_current_node');
  const bossNode=run.graph.nodes.find(node=>node.kind==='boss'),bossTelegraph=bossNode?expeditionBossTelegraph(bossNode.contentId):undefined;
  const revealed=[run.graph.entryNodeId,...run.persistentState.visitedNodeIds,run.currentNodeId];
  const graph=coopRouteClientProjection(run.graph,revealed);
  const visible=new Set(graph.nodes.map(node=>node.nodeId));
  const options=run.phase==='awaiting_choice'?current.nextNodeIds.filter(id=>visible.has(id)).map(id=>graph.nodes.find(node=>node.nodeId===id)!).filter(Boolean).map(node=>({...node,...(['battle','elite','boss'].includes(node.kind)?{encounterPreview:expeditionEncounterPreview(node.contentId)}:{})})):[];
  const team=run.players.map((player,index):PublicQModeMember=>{const state=run.persistentState.actors[player.id];if(!state)throw new Error('missing_qmode_actor_state');const companionId=(player.tags??[]).find(tag=>tag.startsWith('companion:'))?.slice('companion:'.length),bodyTag=(player.tags??[]).find(tag=>tag.startsWith('body:'))?.slice('body:'.length),bodyPresentation=bodyTag==='female'?'female' as const:bodyTag==='male'?'male' as const:undefined;return{memberId:player.id,displayName:player.name,role:player.role as CoopRole,classId:player.classId??'',bodyPresentation,companionId,kind:index===0?'controller':'echo',effectiveLevel:player.level,currentHp:state.hp,maximumHp:player.stats.maxHp,downed:state.downed};});
  return {runId:run.id,mode,phase:run.phase,tier:run.tier,expeditionId:run.expeditionId,controller:true,team:mode==='live'?team.map(member=>({...member,kind:'controller' as const})):team,graph,currentNodeId:run.currentNodeId,options,visitedNodeIds:[...run.persistentState.visitedNodeIds],resources:run.persistentState.resources,boons:[...run.persistentState.boons],artifacts:[...run.persistentState.artifacts],curses:[...run.persistentState.curses],personalEffects:run.persistentState.personalEffects,...(bossTelegraph?{bossMechanic:{label:'Dungeon boss mechanics',summary:'Read the cast telegraphs and interrupt dangerous abilities before the final phase.',tone:'mixed' as const,telegraph:bossTelegraph}}:{}),lastCombat:projectCombatReplay(run.lastResolution),settlement:{status:(run.phase==='completed'||run.phase==='failed')?'pending_entitlement':'not_ready'}};
}
