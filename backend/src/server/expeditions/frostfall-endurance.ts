import type {CoopRouteGraph,CoopRouteNode} from '../../shared/coop-types';
import type {EventExpeditionDefinition} from './content/event-expeditions';
import {deterministicInt} from './rng';
import {validateCoopRouteGraph,DUNGEON_ENDURANCE} from './route-generation';

/** Unreleased seasonal variant. Existing event-route-v5 saves retain their six-room graph. */
export const FROSTFALL_ENDURANCE_GENERATOR='event-route-v5-endurance-v2';
export const FROSTFALL_ENDURANCE_DEPTH_REWARDS=[1,1.15,1.28,1.38,1.46,1.52] as const;
export const FROSTFALL_DAILY_REWARDED_CLEARS=2;

const idsAt=(depth:number)=>[0,1,2].map(choice=>'d'+depth+'-c'+choice);

export function frostfallRewardMultiplierForBoss(graph:CoopRouteGraph,bossNode:CoopRouteNode):number{
 if(graph.generatorVersion!==FROSTFALL_ENDURANCE_GENERATOR)return 1;
 if(bossNode.kind!=='boss'||bossNode.contentId!==graph.nodes.find(node=>node.nodeId===graph.bossNodeId)?.contentId)throw new Error('invalid_frostfall_boss_exit');
 const cleared=bossNode.depth-1;
 if(cleared<7||cleared>DUNGEON_ENDURANCE.maxNormalRooms||cleared%DUNGEON_ENDURANCE.checkpointInterval!==0)throw new Error('invalid_frostfall_boss_depth');
 return FROSTFALL_ENDURANCE_DEPTH_REWARDS[cleared/DUNGEON_ENDURANCE.checkpointInterval-1];
}

/** Seasonal content uses the standard Endurance-v2 checkpoint geometry and
 * the same 20%-heal Campfire / Boon / Boss choices, not a second queue.
 * Seasonal Warmth, hearths and the frozen Rimebell boss are event-specific.
 */
export function generateFrostfallEnduranceGraph(def:EventExpeditionDefinition,runId:string,secret:string):CoopRouteGraph{
 if(def.id!=='EVENT_FROSTFALL_AURORA_HOLLOW')throw new Error('invalid_frostfall_definition');
 const count=DUNGEON_ENDURANCE.maxNormalRooms;
 const nodes:CoopRouteNode[]=[{nodeId:'entry',depth:0,kind:'entry',contentId:'COOP_ENTRY',modifierId:'none',risk:1,rewardTag:'none',nextNodeIds:idsAt(1)}];
 for(let depth=1;depth<=count;depth++){
  const checkpoint=depth>1&&(depth-1)%DUNGEON_ENDURANCE.checkpointInterval===0;
  const next=depth===count?['boss']:idsAt(depth+1);
  const localDepth=((depth-1)%DUNGEON_ENDURANCE.checkpointInterval)+1;
  const base=deterministicInt(secret,1,3,'frostfall-endurance-v2',def.id,runId,depth);
  for(const choice of [0,1,2]){
   const nodeId='d'+depth+'-c'+choice;
   if(checkpoint){
    if(choice===2){nodes.push({nodeId,depth,kind:'boss',contentId:def.bossEncounterId,modifierId:'checkpoint',risk:1.25,rewardTag:'boss',nextNodeIds:[],title:def.finalBoss});continue;}
    const isCamp=choice===0;
    nodes.push({nodeId,depth,kind:isCamp?'camp':'shrine',contentId:isCamp?'EVENT_FROSTFALL_FESTIVAL_HEARTH':'EVENT_FROSTFALL_AURORA_BRAZIER',modifierId:isCamp?'checkpoint-camp-v2':'checkpoint-boon-v2',risk:1,rewardTag:isCamp?'camp':'boon',nextNodeIds:next,title:isCamp?'Festival Campfire · Continue':'Aurora Boon · Continue',mechanicDelta:isCamp?18:12,objectiveDelta:isCamp?1:0});
    continue;
   }
   // Repeat seasonal room types across each seven-room stretch without repeating the old short graph.
   const special=def.specialNodes.find(item=>item.depth===localDepth&&item.choice===choice);
   if(special){nodes.push({nodeId,depth,kind:special.kind,contentId:special.contentId,modifierId:'frostfall-'+choice,risk:special.risk??(special.kind==='risk'?1.18:special.kind==='elite'?1.10:1),rewardTag:special.rewardTag,nextNodeIds:next,title:special.title,mechanicDelta:special.mechanicDelta,objectiveDelta:special.objectiveDelta??0});continue;}
   const contentIndex=((base+choice-1)%3)+1;
   const highlight=def.routeHighlights[(depth-1)%def.routeHighlights.length];
   nodes.push({nodeId,depth,kind:'battle',contentId:def.encounterPrefix+'_BATTLE_0'+contentIndex,modifierId:'frostfall-'+choice,risk:1,rewardTag:'battle',nextNodeIds:next,title:'Battle through '+highlight,mechanicDelta:-4,objectiveDelta:0});
  }
 }
 nodes.push({nodeId:'boss',depth:count+1,kind:'boss',contentId:def.bossEncounterId,modifierId:'final',risk:1.25,rewardTag:'boss',nextNodeIds:[],title:def.finalBoss});
 const graph:CoopRouteGraph={schemaVersion:1,generatorVersion:FROSTFALL_ENDURANCE_GENERATOR,runId,expeditionId:def.id,contentVersion:'event-frostfall-endurance-v2',balanceVersion:'event-frostfall-endurance-v2',preBossNodeCount:count,entryNodeId:'entry',bossNodeId:'boss',nodes};
 validateCoopRouteGraph(graph);
 return graph;
}
