import type {CoopRouteGraph,CoopRouteNode} from '../../shared/coop-types';
import type {EventExpeditionDefinition} from './content/event-expeditions';
import {deterministicInt} from './rng';
import {validateCoopRouteGraph,DUNGEON_ENDURANCE} from './route-generation';

/** Unreleased seasonal variant. Existing event-route-v5 saves retain their six-room graph. */
export const FROSTFALL_ENDURANCE_GENERATOR='event-route-v5-endurance-v2';
export const FROSTFALL_ENDURANCE_DEPTH_REWARDS=[1,1.15,1.28,1.38,1.46,1.52] as const;
/** REVIEW CANDIDATE ONLY. Entry enemies must not wipe well-equipped level-gated
 * parties before the first checkpoint. Keep original six-room Frostfall save
 * math unchanged and version later-floor scaling separately. Re-evaluate after calibrated
 * multi-seed combat results; never apply to regular dungeons/other events. */
export const FROSTFALL_ENDURANCE_ENEMY_PACING_V3={attack:0.72,hp:0.80,defense:0.90} as const;
/** Tier I has a smaller normalized player health/damage budget; this isolated
 * starter bracket is deliberately gentler than the higher-level tiers. */
export const FROSTFALL_ENDURANCE_TIER1_EXTRA_V3={attack:0.70,hp:0.85,defense:0.90} as const;
/** Tier II remains noticeably harder than I but needs a viable first clear. */
export const FROSTFALL_ENDURANCE_TIER2_EXTRA_V3={attack:0.85,hp:0.90,defense:0.95} as const;
export const FROSTFALL_ENDURANCE_BALANCE_V3='event-frostfall-endurance-v3';
/** The original 3.334x HP / 2.142x attack at floor 42 was unreachable in the
 * calibrated 125-case draft matrix. These slower multiplicative growth rates
 * apply only to new v3 seasonal runs; all saved v2 curves stay frozen. */
export const FROSTFALL_ENDURANCE_DEPTH_CURVE_V3={attack:1.010,hp:1.016,defense:1.005} as const;
const ORIGINAL_FROSTFALL_DEPTH_CURVE={attack:1.022,hp:1.035,defense:1.012} as const;
export function frostfallDepthCurveForGraph(graph:Pick<CoopRouteGraph,'generatorVersion'|'balanceVersion'>){
 return graph.generatorVersion===FROSTFALL_ENDURANCE_GENERATOR&&graph.balanceVersion===FROSTFALL_ENDURANCE_BALANCE_V3
  ?FROSTFALL_ENDURANCE_DEPTH_CURVE_V3:ORIGINAL_FROSTFALL_DEPTH_CURVE;
}

const ORIGINAL_FROSTFALL_ENEMY_PACING={attack:1,hp:1,defense:1} as const;
export function frostfallEnemyPacingForGraph(graph:Pick<CoopRouteGraph,'generatorVersion'|'balanceVersion'>,tier:number){
 if(graph.generatorVersion!==FROSTFALL_ENDURANCE_GENERATOR||graph.balanceVersion!==FROSTFALL_ENDURANCE_BALANCE_V3)return ORIGINAL_FROSTFALL_ENEMY_PACING;
 const extra=tier===1?FROSTFALL_ENDURANCE_TIER1_EXTRA_V3:tier===2?FROSTFALL_ENDURANCE_TIER2_EXTRA_V3:null;
 if(!extra)return FROSTFALL_ENDURANCE_ENEMY_PACING_V3;
 return {attack:FROSTFALL_ENDURANCE_ENEMY_PACING_V3.attack*extra.attack,
  hp:FROSTFALL_ENDURANCE_ENEMY_PACING_V3.hp*extra.hp,
  defense:FROSTFALL_ENDURANCE_ENEMY_PACING_V3.defense*extra.defense};
}


const idsAt=(depth:number)=>[0,1,2].map(choice=>'d'+depth+'-c'+choice);

export function frostfallRewardMultiplierForBoss(graph:CoopRouteGraph,bossNode:CoopRouteNode):number{
 if(graph.generatorVersion!==FROSTFALL_ENDURANCE_GENERATOR)return 1;
 if(bossNode.kind!=='boss'||bossNode.contentId!==graph.nodes.find(node=>node.nodeId===graph.bossNodeId)?.contentId)throw new Error('invalid_frostfall_boss_exit');
 const cleared=bossNode.depth-1;
 if(cleared<7||cleared>DUNGEON_ENDURANCE.maxNormalRooms||cleared%DUNGEON_ENDURANCE.checkpointInterval!==0)throw new Error('invalid_frostfall_boss_depth');
 // Require an actual exit from the server-frozen graph, not just a forged boss
 // object with a valid-looking depth/content ID.
 const canonical=graph.nodes.find(node=>node.nodeId===bossNode.nodeId);
 if(!canonical||canonical.kind!=='boss'||canonical.depth!==bossNode.depth||canonical.contentId!==bossNode.contentId||canonical.modifierId!==bossNode.modifierId||canonical.nextNodeIds.length!==0)throw new Error('invalid_frostfall_boss_exit');
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
 const graph:CoopRouteGraph={schemaVersion:1,generatorVersion:FROSTFALL_ENDURANCE_GENERATOR,runId,expeditionId:def.id,contentVersion:'event-frostfall-endurance-v2',balanceVersion:FROSTFALL_ENDURANCE_BALANCE_V3,preBossNodeCount:count,entryNodeId:'entry',bossNodeId:'boss',nodes};
 validateCoopRouteGraph(graph);
 return graph;
}
