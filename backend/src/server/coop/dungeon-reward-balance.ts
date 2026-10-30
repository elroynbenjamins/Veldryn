import {EXPEDITIONS} from '../expeditions/content/launch-content';
import {marksForRun,type RewardState} from '../expeditions/rewards';
import type {QModeRun} from './qmode';

/** Authoritative payout is derived from a frozen run, never a client tier or
 * reward estimate. Marks are computed once at terminal node settlement. */
export function dungeonRewardState(run:QModeRun):RewardState{
 const lastNode=run.lastResolution?.nodeId;
 const last=run.graph.nodes.find(node=>node.nodeId===lastNode);
 const visited=run.persistentState.visitedNodeIds.filter(id=>id!==run.graph.entryNodeId&&id!==run.graph.bossNodeId).length;
 const routeProgress=Math.max(0,Math.min(1,visited/Math.max(1,run.graph.preBossNodeCount)));
 let finalBossHpFraction: number|undefined;
 if(last?.kind==='boss'&&run.phase==='failed'){
  const summary=run.lastResolution?.result.summary;
  const hp=summary?.enemyHp as Record<string,unknown>|undefined;
  const combatants=summary?.replayCombatants as Array<{id:string;maxHp:number;boss:boolean}>|undefined;
  const boss=combatants?.find(member=>member.boss&&typeof member.maxHp==='number'&&member.maxHp>0);
  if(boss&&hp&&typeof hp[boss.id]==='number'){
   finalBossHpFraction=Math.max(0,Math.min(1,(hp[boss.id] as number)/boss.maxHp));
  }
 }
 return {cleared:run.phase==='completed',routeProgress,reachedFinalBoss:last?.kind==='boss',...(finalBossHpFraction===undefined?{}:{finalBossHpFraction})};
}

/** Version 1 Live runs retain their pre-upgrade rewards to avoid changing
 * payments for an already committed run. Fresh runs use the shared formula. */
export function enhancedDungeonMarks(run:QModeRun):number{
 if(run.phase!=='completed'&&run.phase!=='failed')return 0;
 const definition=EXPEDITIONS[run.expeditionId];
 if(!definition)throw new Error('unknown_expedition');
 if(run.tierScalingVersion!==2)return Math.max(0,Math.round(definition.baseMarks*.8));
 return marksForRun(definition.baseMarks,run.tier,dungeonRewardState(run));
}
