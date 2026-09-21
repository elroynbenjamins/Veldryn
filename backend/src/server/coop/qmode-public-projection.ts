import type {CoopRole,CoopRouteGraph,CoopRouteNode} from '../../shared/coop-types';
import {coopRouteClientProjection} from '../expeditions/route-generation';
import type {QModeRun} from './qmode';

export interface PublicQModeMember {memberId:string;displayName:string;role:CoopRole;classId:string;companionId?:string;kind:'controller'|'echo';effectiveLevel:number;currentHp:number;maximumHp:number;downed:boolean;}
export interface PublicQModeRunProjection {
  runId:string;mode:'qmode';phase:QModeRun['phase'];tier:QModeRun['tier'];expeditionId:string;
  controller:true;team:PublicQModeMember[];graph:CoopRouteGraph;currentNodeId:string;
  options:CoopRouteNode[];visitedNodeIds:string[];resources:number;boons:string[];artifacts:string[];curses:string[];personalEffects:Record<string,{boons:string[];artifacts:string[];purchases:string[]}>;
  settlement:{status:'not_ready'|'pending_entitlement'};
}

/** Sanitizes the server-owned run for its controller. Echo source account IDs,
 * hidden graph nodes, RNG state and calculated-but-unentitled rewards stay private. */
export function projectQModeRun(run:QModeRun):PublicQModeRunProjection{
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);if(!current)throw new Error('invalid_qmode_current_node');
  const revealed=[run.graph.entryNodeId,...run.persistentState.visitedNodeIds,run.currentNodeId];
  const graph=coopRouteClientProjection(run.graph,revealed);
  const visible=new Set(graph.nodes.map(node=>node.nodeId));
  const options=run.phase==='awaiting_choice'?current.nextNodeIds.filter(id=>visible.has(id)).map(id=>graph.nodes.find(node=>node.nodeId===id)!).filter(Boolean):[];
  const team=run.players.map((player,index):PublicQModeMember=>{const state=run.persistentState.actors[player.id];if(!state)throw new Error('missing_qmode_actor_state');const companionId=(player.tags??[]).find(tag=>tag.startsWith('companion:'))?.slice('companion:'.length);return{memberId:player.id,displayName:player.name,role:player.role as CoopRole,classId:player.classId??'',companionId,kind:index===0?'controller':'echo',effectiveLevel:player.level,currentHp:state.hp,maximumHp:player.stats.maxHp,downed:state.downed};});
  return {runId:run.id,mode:'qmode',phase:run.phase,tier:run.tier,expeditionId:run.expeditionId,controller:true,team,graph,currentNodeId:run.currentNodeId,options,visitedNodeIds:[...run.persistentState.visitedNodeIds],resources:run.persistentState.resources,boons:[...run.persistentState.boons],artifacts:[...run.persistentState.artifacts],curses:[...run.persistentState.curses],personalEffects:run.persistentState.personalEffects,settlement:{status:(run.phase==='completed'||run.phase==='failed')?'pending_entitlement':'not_ready'}};
}
