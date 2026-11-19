import {deterministicInt} from '../expeditions/rng';
import type {QModeRun} from './qmode';

/** Per-run objectives. All progress is calculated from the server-owned graph,
 * resolved node history and combat outcome, never from client counters. */
export const DUNGEON_CONTRACTS={
 DEEP_15:{id:'DEEP_15',name:'Deep Delver',description:'Reach room 15 in one dungeon run.',metric:'depth',target:15},
 DEEP_22:{id:'DEEP_22',name:'Veteran Explorer',description:'Reach room 22 in one dungeon run.',metric:'depth',target:22},
 ELITE_3:{id:'ELITE_3',name:'Elite Hunter',description:'Defeat 3 elite rooms in one dungeon run.',metric:'elite',target:3},
 ELITE_5:{id:'ELITE_5',name:'Elite Slayer',description:'Defeat 5 elite rooms in one dungeon run.',metric:'elite',target:5},
 RELICS_3:{id:'RELICS_3',name:'Relic Collector',description:'Find 3 artifacts in one dungeon run.',metric:'artifact',target:3},
 LATE_BOSS:{id:'LATE_BOSS',name:'Deep Conqueror',description:'Defeat a boss at room 15 or deeper.',metric:'lateBoss',target:1},
} as const;
export type DungeonContractId=keyof typeof DUNGEON_CONTRACTS;
export interface DungeonContractProgress{
 id:DungeonContractId;name:string;description:string;progress:number;target:number;completed:boolean;
}
/** One depth, one elite and one discovery/boss contract per new Endurance run.
 * IDs are frozen with the run for reconnects, retries and Live spectators. */
export function assignDungeonContracts(secret:string,runId:string,contentVersion:string):DungeonContractId[]{
 const pools:readonly (readonly DungeonContractId[])[]=[
  ['DEEP_15','DEEP_22'],
  ['ELITE_3','ELITE_5'],
  ['RELICS_3','LATE_BOSS'],
 ];
 return pools.map((options,index)=>options[deterministicInt(secret,0,options.length-1,'dungeon-contracts-v1',runId,contentVersion,index)]);
}
export function dungeonContractProgress(run:Pick<QModeRun,'contractIds'|'enduranceRouteVersion'|'graph'|'persistentState'|'phase'|'currentNodeId'|'lastResolution'>):DungeonContractProgress[]{
 if(run.enduranceRouteVersion!==1||!run.contractIds?.length)return [];
 const graph=new Map(run.graph.nodes.map(node=>[node.nodeId,node]));
 const visited=run.persistentState.visitedNodeIds;
 const lastFailed=run.lastResolution?.result.success===false?run.lastResolution.nodeId:undefined;
 const cleared=visited.filter(id=>id!==lastFailed);
 const deepest=visited.reduce((max,id)=>Math.max(max,graph.get(id)?.depth??0),0);
 const eliteClears=cleared.filter(id=>graph.get(id)?.kind==='elite').length;
 const lateBoss=run.phase==='completed'&&graph.get(run.currentNodeId)?.kind==='boss'&&(graph.get(run.currentNodeId)?.depth??0)>=15?1:0;
 return run.contractIds.map(id=>{
  const contract=DUNGEON_CONTRACTS[id];
  if(!contract)throw new Error('invalid_dungeon_contract_id');
  const value=contract.metric==='depth'?deepest:contract.metric==='elite'?eliteClears:contract.metric==='artifact'?run.persistentState.artifacts.length:lateBoss;
  const progress=Math.min(contract.target,Math.max(0,value));
  return {id,name:contract.name,description:contract.description,progress,target:contract.target,completed:progress>=contract.target};
 });
}
