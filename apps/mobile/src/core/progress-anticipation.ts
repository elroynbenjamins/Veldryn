export type AnticipationBand='none'|'near'|'urgent'|'next';

export function progressAnticipation(current:number,target:number,{nearAt=.80,urgentAt=.95,integer=false}:{nearAt?:number;urgentAt?:number;integer?:boolean}={}):{band:AnticipationBand;remaining:number;ratio:number}{
  const safeTarget=Math.max(0,Number.isFinite(target)?target:0),safeCurrent=Math.max(0,Number.isFinite(current)?current:0);
  if(safeTarget<=0||safeCurrent>=safeTarget)return {band:'none',remaining:0,ratio:safeTarget<=0?0:1};
  const remaining=Math.max(0,safeTarget-safeCurrent),ratio=Math.max(0,Math.min(1,safeCurrent/safeTarget));
  if(integer&&remaining<=1)return {band:'next',remaining,ratio};
  if(ratio>=urgentAt)return {band:'urgent',remaining,ratio};
  if(ratio>=nearAt)return {band:'near',remaining,ratio};
  return {band:'none',remaining,ratio};
}

export function contractAnticipation(progress:number,target:number){
  const remaining=Math.max(0,target-progress);
  if(remaining<=0)return {band:'none' as AnticipationBand,remaining};
  if(remaining===1)return {band:'next' as AnticipationBand,remaining};
  const threshold=Math.max(2,Math.ceil(target*.20));
  return {band:remaining<=Math.max(1,Math.ceil(target*.08))?'urgent' as AnticipationBand:remaining<=threshold?'near' as AnticipationBand:'none' as AnticipationBand,remaining};
}

export function forgeAnticipation(remainingSeconds:number,durationSeconds:number){
  const remaining=Math.max(0,Math.ceil(remainingSeconds));
  if(remaining<=0)return {band:'none' as AnticipationBand,remaining};
  const elapsed=Math.max(0,durationSeconds-remaining),generic=progressAnticipation(elapsed,Math.max(1,durationSeconds),{nearAt:.85,urgentAt:.95});
  const band=remaining<=15?'urgent':remaining<=60&&generic.band==='none'?'near':generic.band;
  return {band,remaining};
}

export const MASTERY_ANTICIPATION_MILESTONES=Object.freeze([
  {rank:5,points:125,label:'+1% damage bonus'},
  {rank:10,points:250,label:'drop knowledge'},
  {rank:15,points:375,label:'+3% material bonus'},
  {rank:20,points:500,label:'elite knowledge'},
  {rank:25,points:625,label:'mastery badge'},
  {rank:30,points:750,label:'master bonuses'},
] as const);

export function masteryMilestoneAnticipation(points:number){
  const safe=Math.max(0,Math.floor(points)),index=MASTERY_ANTICIPATION_MILESTONES.findIndex(row=>safe<row.points);
  if(index<0)return undefined;
  const next=MASTERY_ANTICIPATION_MILESTONES[index],previousPoints=index===0?0:MASTERY_ANTICIPATION_MILESTONES[index-1].points,remaining=next.points-safe;
  const band:AnticipationBand=remaining===1?'next':remaining<=2?'urgent':remaining<=5?'near':'none';
  return {...next,previousPoints,remaining,band,progress:Math.max(0,Math.min(1,(safe-previousPoints)/Math.max(1,next.points-previousPoints)))};
}

export function pityAnticipation(misses:number,pityAt:number){
  const safeMisses=Math.max(0,Math.floor(misses)),safePity=Math.max(1,Math.floor(pityAt)),remaining=Math.max(1,safePity-safeMisses);
  const nearThreshold=Math.max(2,Math.ceil(safePity*.10));
  const urgentThreshold=Math.max(1,Math.ceil(safePity*.04));
  const band:AnticipationBand=remaining===1?'next':remaining<=urgentThreshold?'urgent':remaining<=nearThreshold?'near':'none';
  return {band,remaining};
}
