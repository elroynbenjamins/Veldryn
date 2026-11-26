import {deterministicShuffle} from '../expeditions/rng';
import {DUNGEON_ARTIFACTS,isDungeonArtifact,type DungeonArtifactId} from './dungeon-artifacts';
import type {QModeRun} from './qmode';

export interface RoomArtifactOffer {id:DungeonArtifactId;name:string;description:string;}
const CHOICE_KINDS=new Set(['treasure','secret']);
/** Pure deterministic per-room draft; no client can select an unrevealed relic. */
export function roomArtifactOffers(run:QModeRun,secret:string):RoomArtifactOffer[]{
 if(run.enduranceRouteVersion!==1||run.qmodePressureVersion!==1||run.phase!=='awaiting_choice')return [];
 const last=run.lastResolution;
 if(!last||last.nodeId!==run.currentNodeId||!last.result.success||!CHOICE_KINDS.has(String(last.result.summary.kind)))return [];
 if(run.chosenRoomArtifacts?.[last.nodeId])return [];
 const current=run.graph.nodes.find(node=>node.nodeId===last.nodeId);
 if(!current||current.kind!==last.result.summary.kind)return [];
 const all=Object.keys(DUNGEON_ARTIFACTS) as DungeonArtifactId[];
 const newOrUnstacked=all.filter(id=>run.persistentState.artifacts.filter(owned=>owned===id).length<2);
 const shuffled=deterministicShuffle(secret,newOrUnstacked.length>=3?newOrUnstacked:all,'dungeon-artifact-draft-v1',run.id,current.nodeId,current.depth,run.graph.contentVersion);
 return shuffled.slice(0,3).map(id=>({id,name:DUNGEON_ARTIFACTS[id].name,description:DUNGEON_ARTIFACTS[id].description}));
}
export function applyRoomArtifact(run:QModeRun,id:DungeonArtifactId):void{
 if(!isDungeonArtifact(id))throw new Error('invalid_artifact_choice');
 if(run.chosenRoomArtifacts?.[run.currentNodeId])throw new Error('artifact_already_chosen');
 run.persistentState={...run.persistentState,artifacts:[...run.persistentState.artifacts,id]};
 run.chosenRoomArtifacts={...(run.chosenRoomArtifacts??{}),[run.currentNodeId]:id};
}
