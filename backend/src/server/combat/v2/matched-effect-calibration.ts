/** Matched conditional-effect calibration summary. No invented CP weights.
 * Report within-role/boss/effect strata; baseline-zero outcomes are distinct
 * evidence, never a fake ratio of 1 or an infinite percent improvement. */
import type {RoleCalibrationObservationV2} from './role-power-calibration-review';
type Vector=RoleCalibrationObservationV2['values'];
type Role=RoleCalibrationObservationV2['role'];
export interface MatchedEffectSampleV2{
 readonly caseId:string;readonly bossId:string;readonly role:Role;readonly effectId:string;
 readonly before:Readonly<Vector>;readonly after:Readonly<Vector>;
 readonly beforeVictory:boolean;readonly afterVictory:boolean;
 readonly beforeDowned:boolean;readonly afterDowned:boolean;
 readonly observedEvents:number;
}
const metrics=['damagePerSecond','effectiveHealingPerSecond','survivingHpFraction',
 'shieldGrantedPerSecond','interruptsPerSecond','cleanseEventsPerSecond'] as const;
const finite=(n:number)=>Number.isFinite(n)&&n>=0;
const mean=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const median=(xs:number[])=>{
 if(!xs.length)return null;
 const s=[...xs].sort((a,b)=>a-b),mid=Math.floor(s.length/2);
 return s.length%2?s[mid]:(s[mid-1]+s[mid])/2;
};
export function summarizeMatchedEffectsV2(samples:readonly MatchedEffectSampleV2[]){
 if(!samples.length)throw Error('combat_v2_matched_effect_empty');
 const seen=new Set<string>(),groups=new Map<string,MatchedEffectSampleV2[]>();
 for(const s of samples){
  const id=JSON.stringify([s.caseId,s.effectId]);
  if(!s.caseId||!s.bossId||!s.effectId||!['tank','damage','support'].includes(s.role)||
   seen.has(id)||!Number.isSafeInteger(s.observedEvents)||s.observedEvents<0||
   metrics.some(k=>!finite(s.before[k])||!finite(s.after[k])))
   throw Error('combat_v2_matched_effect_invalid_sample');
  seen.add(id);
  const key=JSON.stringify([s.effectId,s.role,s.bossId]);
  const group=groups.get(key)??[];group.push(s);groups.set(key,group);
 }
 const cells=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,rows])=>{
  const ordered=[...rows].sort((a,b)=>a.caseId.localeCompare(b.caseId));
  const first=ordered[0];
  return {effectId:first.effectId,role:first.role,bossId:first.bossId,cases:ordered.length,
   casesWithObservedEvents:ordered.filter(x=>x.observedEvents>0).length,
   observedEvents:ordered.reduce((n,x)=>n+x.observedEvents,0),
   victoryGains:ordered.filter(x=>!x.beforeVictory&&x.afterVictory).length,
   victoryLosses:ordered.filter(x=>x.beforeVictory&&!x.afterVictory).length,
   downedAvoided:ordered.filter(x=>x.beforeDowned&&!x.afterDowned).length,
   newDowns:ordered.filter(x=>!x.beforeDowned&&x.afterDowned).length,
   metrics:Object.fromEntries(metrics.map(k=>{
    const ratios=ordered.filter(x=>x.before[k]>0).map(x=>x.after[k]/x.before[k]-1);
    if(ratios.some(x=>!Number.isFinite(x)))throw Error('combat_v2_matched_effect_invalid_ratio');
    return [k,{meanAbsoluteDelta:mean(ordered.map(x=>x.after[k]-x.before[k])),
     medianRelativeDelta:median(ratios),positiveBaselineCases:ratios.length,
     zeroToPositive:ordered.filter(x=>x.before[k]===0&&x.after[k]>0).length,
     zeroToZero:ordered.filter(x=>x.before[k]===0&&x.after[k]===0).length}];
   }))};
 });
 return {scope:'MATCHED_EFFECT_OUTCOMES_NOT_CP' as const,samples:samples.length,cells,
  cpApproved:false as const,releaseEnabled:false as const,
  limitations:['synthetic_gear','solo_support_not_party_utility','events_not_causal_value'] as const};
}
