/**
 * World Boss v8 role-normalized Impact PROPOSAL / offline preview only.
 *
 * No World Sigil grant, milestone entitlement or backend route consumes this
 * module. It requires externally sampled, power-bracket + class-specific
 * benchmarks; never infer benchmark output from client-supplied stats.
 */
import {clamp} from './calculations';
import type {CombatRole} from './types';
import type {WorldBossRoleLedger,WorldBossRoundResult,WorldBossId,WorldBossPhase} from './world-boss-round-prototype';

type WorldBossPrimaryRole=Exclude<CombatRole,'enemy'>;
type MetricKey='damage'|'guard'|'sustain'|'protection'|'utility'|'survival';
export interface WorldBossImpactReferencePrototype {
 /** Server-only published benchmark set identifier, not a client-calculated rating. */
 version:string;
 boss:WorldBossId;
 phase:WorldBossPhase;
 role:WorldBossPrimaryRole;
 /** Reference derived from actual equipped character class, not role-wide averaging. */
 classId:string;
 bracket:1|2|3|4|5;
 /** Number of independent deterministic samples for this reference. */
 samples:number;
 damage:number;
 guard:number;
 sustain:number;
 protection:number;
 utility:number;
}
export interface WorldBossImpactPreview {
 score:number;
 role:WorldBossPrimaryRole;
 classId:string;
 bracket:1|2|3|4|5;
 benchmarkVersion:string;
 breakdown:Partial<Record<MetricKey,{actual:number;reference:number;weightedPoints:number}>>;
 /** Irrespective of score, this prototype can never grant account currency. */
 rewardEligible:false;
}
export interface WorldBossImpactAccountMilestonePreview {
 total:number;
 reached:readonly {threshold:number;hypotheticalSigils:number}[];
 hypotheticalTotalMilestoneSigils:number;
 rewardEligible:false;
}
const valid=(v:number)=>Number.isFinite(v)&&v>=0;
const round=(v:number)=>Math.round(v*10000)/10000;
const weights:Record<WorldBossPrimaryRole,Record<MetricKey,number>>={
 tank:{damage:.35,guard:0,sustain:.10,protection:.45,utility:0,survival:.10},
 damage:{damage:.75,guard:.20,sustain:0,protection:0,utility:0,survival:.05},
 support:{damage:.20,guard:0,sustain:.65,protection:0,utility:.10,survival:.05},
};
function metrics(p:WorldBossRoleLedger):Record<MetricKey,number>{
 return {
  damage:p.bossHpDamage,
  guard:p.guardDamage,
  sustain:p.effectiveHealing+p.shieldConsumed,
  protection:p.tankProtection,
  utility:p.cleansePrevented+p.interrupts*1, // Count is provisional: never mint for uncalibrated unit conversions.
  survival:Number(p.survived),
 };
}
/**
 * Adaptive weights only redistribute channels whose reference value is ZERO
 * in a particular phase. This prevents scoring unrealized mitigation/overheal,
 * while keeping class-specific utility (healer vs shield specialist) comparable.
 * A reference without meaningful sampled values is rejected, never assigned a
 * magical benchmark or free Sigils.
 */
export function previewWorldBossImpactPrototype(input:{
 result:WorldBossRoundResult;
 initiatorActorId:string;
 classId:string;
 role:WorldBossPrimaryRole;
 bracket:1|2|3|4|5;
 benchmark:WorldBossImpactReferencePrototype;
}):WorldBossImpactPreview {
 const {result,initiatorActorId,benchmark,role,classId,bracket}=input;
 if(!Object.prototype.hasOwnProperty.call(result.participants,initiatorActorId))
  throw Error('world_boss_impact_missing_initiator');
 if(!['tank','damage','support'].includes(role)||!Number.isInteger(bracket)||bracket<1||bracket>5)
  throw Error('world_boss_impact_invalid_role_or_bracket');
 if(!benchmark.version||benchmark.version.length>160||!classId||benchmark.classId!==classId||
  benchmark.boss!==result.boss||benchmark.phase!==result.phase||
  benchmark.role!==role||benchmark.bracket!==bracket||
  !Number.isSafeInteger(benchmark.samples)||benchmark.samples<100)
  throw Error('world_boss_impact_uncalibrated_reference');
 const refs:Record<MetricKey,number>={
  damage:benchmark.damage,guard:benchmark.guard,sustain:benchmark.sustain,
  protection:benchmark.protection,utility:benchmark.utility,survival:1,
 };
 if(Object.values(refs).some(v=>!valid(v))||benchmark.damage<=0)
  throw Error('world_boss_impact_invalid_benchmark_values');
 const observed=metrics(result.participants[initiatorActorId]);
 if(Object.values(observed).some(v=>!valid(v)))throw Error('world_boss_impact_invalid_ledger');
 const applicable=(Object.keys(weights[role]) as MetricKey[]).filter(k=>weights[role][k]>0&&refs[k]>0);
 const totalWeight=applicable.reduce((n,k)=>n+weights[role][k],0);
 if(totalWeight<=0)throw Error('world_boss_impact_missing_references');
 const breakdown:WorldBossImpactPreview['breakdown']={};
 let score=0;
 for(const k of applicable){
  const ratio=clamp(observed[k]/refs[k],0,1.4);
  const points=ratio*weights[role][k]/totalWeight;
  score+=points;
  breakdown[k]={actual:round(observed[k]),reference:round(refs[k]),weightedPoints:round(points)};
 }
 return {score:round(clamp(score,0,1.4)),role,classId,bracket,
  benchmarkVersion:benchmark.version,breakdown,rewardEligible:false};
}
export function previewWorldBossMilestonesPrototype(
 scores:readonly number[],
):WorldBossImpactAccountMilestonePreview{
 if(scores.length>3||scores.some(v=>!valid(v)||v>1.4))
  throw Error('world_boss_impact_invalid_event_scores');
 const total=round(scores.reduce((sum,s)=>sum+s,0));
 const milestones=[{threshold:.8,hypotheticalSigils:5},{threshold:1.8,hypotheticalSigils:10},{threshold:3,hypotheticalSigils:15}];
 const reached=milestones.filter(x=>total+0.00001>=x.threshold);
 return {total,reached,hypotheticalTotalMilestoneSigils:reached.reduce((n,x)=>n+x.hypotheticalSigils,0),rewardEligible:false};
}
