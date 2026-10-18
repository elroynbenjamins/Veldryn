import {claimableLiveEvent,eventMilestones,eventProgress,eventRewardClaimed} from './live-events';
import type {GameState} from './types';

/** Presentation only: earned reputation and claims remain owned by the event runtime. */
export function eventRewardTrail(state:GameState,nowMs=Date.now()){
 const event=claimableLiveEvent(state,nowMs);
 if(!event||!state.character)return null;
 const milestones=eventMilestones(state,nowMs),progress=eventProgress(state,event.definition.id);
 const rows=milestones.filter(entry=>!entry.reward.kind.startsWith('guild_')).sort((a,b)=>a.points-b.points).map(entry=>({
  ...entry,status:eventRewardClaimed(state,event.definition.id,entry.reward.id)?'claimed' as const:progress>=entry.points?'ready' as const:'locked' as const,
 }));
 const next=rows.find(entry=>entry.status==='locked'),target=next?.points??rows[rows.length-1]?.points??0;
 return {event,progress,rows,next,target,remaining:Math.max(0,target-progress),percent:target>0?Math.max(0,Math.min(100,progress/target*100)):0,
  readyCount:rows.filter(entry=>entry.status==='ready').length,claimedCount:rows.filter(entry=>entry.status==='claimed').length,
  allUnlocked:rows.length>0&&!next,allClaimed:rows.length>0&&rows.every(entry=>entry.status==='claimed'),
  hasGuildRewards:milestones.some(entry=>entry.reward.kind.startsWith('guild_')),
  edition:new Date(event.runtime.startsAtMs).getUTCFullYear(),
 };
}
