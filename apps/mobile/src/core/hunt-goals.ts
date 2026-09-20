export type HuntGoalKind='session_kills'|'champion_defeats'|'duration_seconds';
export type HuntGoalId='open'|'kills_50'|'kills_100'|'champion_1'|'duration_30m';
export interface HuntGoalSnapshot{kind:HuntGoalKind;value:number;label:string}
export interface HuntGoalDef{id:HuntGoalId;label:string;summary:string;goal?:HuntGoalSnapshot}
export const HUNT_GOAL_IDS:readonly HuntGoalId[]=['open','kills_50','kills_100','champion_1','duration_30m'];
export const HUNT_GOALS:Record<HuntGoalId,HuntGoalDef>={
 open:{id:'open',label:'Open',summary:'Run until you stop it, storage fills, or a safety rule triggers.'},
 kills_50:{id:'kills_50',label:'50 Kills',summary:'Stop after 50 kills in this hunt session.',goal:{kind:'session_kills',value:50,label:'50 kills'}},
 kills_100:{id:'kills_100',label:'100 Kills',summary:'Stop after 100 kills in this hunt session.',goal:{kind:'session_kills',value:100,label:'100 kills'}},
 champion_1:{id:'champion_1',label:'1 Champion',summary:'Stop after defeating the first rare Champion in this hunt.',goal:{kind:'champion_defeats',value:1,label:'1 Champion'}},
 duration_30m:{id:'duration_30m',label:'30 Min',summary:'Stop after 30 minutes of session time.',goal:{kind:'duration_seconds',value:1800,label:'30 minutes'}},
};
export function normalizeHuntGoalId(value:unknown):HuntGoalId{return HUNT_GOAL_IDS.includes(value as HuntGoalId)?value as HuntGoalId:'open'}
export function huntGoalSnapshot(value:unknown){return HUNT_GOALS[normalizeHuntGoalId(value)].goal}

export function huntGoalProgress(activity:{startedAtMs:number;huntGoal?:HuntGoalSnapshot;sessionKills?:number;sessionChampions?:number},pendingKills=0,pendingChampions=0,nowMs=Date.now()){
 const goal=activity.huntGoal;if(!goal)return undefined;
 const current=goal.kind==='session_kills'?(activity.sessionKills??0)+pendingKills:goal.kind==='champion_defeats'?(activity.sessionChampions??0)+pendingChampions:Math.max(0,Math.floor((nowMs-activity.startedAtMs)/1000));
 return {current:Math.min(goal.value,current),target:goal.value,label:goal.label,complete:current>=goal.value,kind:goal.kind};
}

export type HuntMomentumTierId='tracking'|'focused'|'dominant'|'relentless';
export interface HuntMomentumTier{id:HuntMomentumTierId;name:string;minKills:number;bonus:number}
export const HUNT_MOMENTUM_TIERS:readonly HuntMomentumTier[]=[
 {id:'tracking',name:'Tracking',minKills:0,bonus:0},
 {id:'focused',name:'Focused',minKills:25,bonus:.02},
 {id:'dominant',name:'Dominant',minKills:75,bonus:.04},
 {id:'relentless',name:'Relentless',minKills:150,bonus:.06},
];

/** Momentum is session-bound: it resets whenever a combat activity ends or a new target starts. */
export function huntMomentumTier(kills:number){
 const total=Math.max(0,Math.floor(kills));
 let tier=HUNT_MOMENTUM_TIERS[0];
 for(const row of HUNT_MOMENTUM_TIERS)if(total>=row.minKills)tier=row;
 return tier;
}
export function huntMomentumStatus(kills:number){
 const total=Math.max(0,Math.floor(kills)),tier=huntMomentumTier(total),index=HUNT_MOMENTUM_TIERS.findIndex(row=>row.id===tier.id),next=HUNT_MOMENTUM_TIERS[index+1];
 return {kills:total,tier,next,killsToNext:next?Math.max(0,next.minKills-total):0,progressPct:next?Math.max(0,Math.min(1,(total-tier.minKills)/(next.minKills-tier.minKills))):1,bonusPct:Math.round(tier.bonus*100)};
}
/** Returns only the extra reward earned from momentum so base rounding stays unchanged. */
export function huntMomentumBonus(basePerKill:number,existingKills:number,newKills:number){
 const start=Math.max(0,Math.floor(existingKills)),count=Math.max(0,Math.floor(newKills));if(!count||!Number.isFinite(basePerKill)||basePerKill<=0)return 0;
 const end=start+count;let bonus=0;
 for(let i=1;i<HUNT_MOMENTUM_TIERS.length;i++){
  const tier=HUNT_MOMENTUM_TIERS[i],next=HUNT_MOMENTUM_TIERS[i+1],from=Math.max(start,tier.minKills),to=Math.min(end,next?.minKills??end);
  if(to>from)bonus+=(to-from)*basePerKill*tier.bonus;
 }
 return Math.max(0,Math.floor(bonus+1e-9));
}
