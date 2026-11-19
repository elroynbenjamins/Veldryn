import type {GameState} from './types';
import {seasonalQuestBoard} from './seasonal-quests';
import {MONTHLY_QUEST_MILESTONES,monthlyQuestMilestoneStatus} from './monthly-quest-milestones';

export interface QuestClaimAttention{story:number;challenges:number;milestones:number;total:number}

/** Only confirmed, still-claimable rewards count. Recomputed from the active character and period. */
export function questClaimAttention(state:GameState,nowMs:number):QuestClaimAttention{
  const story=state.quests.filter(row=>row.status==='complete').length;
  const claimed=new Set(state.character?.personalSeasonal?.claimIds??state.account.seasonalContractClaimIds??[]);
  const date=new Date(nowMs);
  const challenges=(['daily','weekly','monthly'] as const)
    .flatMap(period=>seasonalQuestBoard(state,period,date))
    .filter(row=>row.progress>=row.required&&!claimed.has(row.id)).length;
  const milestones=monthlyQuestMilestoneStatus(state,nowMs)
    .reduce((sum,month)=>sum+MONTHLY_QUEST_MILESTONES.filter(row=>month.points>=row.points&&!month.claimed.includes(row.points)).length,0);
  return {story,challenges,milestones,total:story+challenges+milestones};
}
