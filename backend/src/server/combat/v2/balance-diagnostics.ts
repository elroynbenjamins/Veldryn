/**
 * PRIVATE, deterministic Equipment/Skills/Enemies 2.0 QA diagnostics.
 * This reports suspicious patterns without inventing live-ready win-rate,
 * role DPS, party throughput or economy targets. Only data integrity fails.
 */
export type CombatV2BalanceKind='normal'|'elite'|'boss';
export type CombatV2GearProfile='low'|'high';
export interface CombatV2SyntheticBalanceSample {
 readonly classId:string;
 readonly spec:string;
 readonly role:string;
 readonly tier:string;
 readonly profile:CombatV2GearProfile;
 readonly kind:CombatV2BalanceKind;
 readonly enemyKit:'generic-t1'|'authored-v2';
 readonly dps:number;
 readonly hps:number;
 readonly damageTaken:number;
 readonly victory:boolean;
 readonly durationMs:number;
 readonly resourceEvents:number;
 readonly mechanics:number;
 readonly baseEquipmentStat:number;
}
export interface CombatV2BalanceFinding {
 readonly type:'zero_damage'|'no_resource_activity'|'dps_inversion'|
 'no_wins_in_group'|'role_spread'|'t1_unverified';
 readonly severity:'review'|'coverage_gap';
 readonly group:string;
 readonly detail:string;
}
export interface CombatV2BalanceBand {
 readonly group:string;
 readonly matches:number;
 readonly wins:number;
 readonly winRate:number;
 readonly medianDps:number;
 readonly medianHps:number;
 readonly medianDamageTaken:number;
 readonly medianDurationMs:number;
 readonly minDps:number;
 readonly maxDps:number;
 readonly zeroDamageMatches:number;
}
export interface CombatV2BalanceDiagnostic {
 readonly provenance:'synthetic_unapproved_2_0';
 readonly count:number;
 readonly bands:readonly CombatV2BalanceBand[];
 readonly findings:readonly CombatV2BalanceFinding[];
 readonly gearProgression:readonly {
  group:string;lowBase:number;highBase:number;
  lowDps:number;highDps:number;dpsRatio:number|null;
 }[];
}
const reject=(why:string):never=>{throw Error('combat_v2_balance_qa_'+why);};
const median=(v:readonly number[]):number=>{
 if(!v.length)reject('empty_band');
 const list=[...v].sort((a,b)=>a-b),m=Math.floor(list.length/2);
 return list.length%2?list[m]:(list[m-1]+list[m])/2;
};
const groupKey=(s:CombatV2SyntheticBalanceSample)=>
 [s.role,s.tier,s.kind,s.profile].join('|');
const gearKey=(s:CombatV2SyntheticBalanceSample)=>
 [s.classId,s.spec,s.tier,s.kind].join('|');
const identity=(s:CombatV2SyntheticBalanceSample)=>
 [s.classId,s.spec,s.tier,s.kind,s.profile].join('|');
const round=(x:number)=>Math.round(x*1e4)/1e4;
/** Pure, sorted diagnostic: review flags NEVER turn into release approval. */
export function analyzeSyntheticBalanceV2(
 samples:readonly CombatV2SyntheticBalanceSample[],
):CombatV2BalanceDiagnostic{
 if(!Array.isArray(samples)||!samples.length)reject('empty_samples');
 const seen=new Set<string>();
 const bands=new Map<string,CombatV2SyntheticBalanceSample[]>();
 const matched=new Map<string,CombatV2SyntheticBalanceSample[]>();
 for(const s of samples){
  if(!s||!s.classId||!s.spec||!s.role||
   !/^T[1-5]$/.test(s.tier)||!['normal','elite','boss'].includes(s.kind)||
   !['low','high'].includes(s.profile)||
   !['generic-t1','authored-v2'].includes(s.enemyKit)||
   (s.tier==='T1')!==(s.enemyKit==='generic-t1')||
   typeof s.victory!=='boolean'||[
    s.dps,s.hps,s.damageTaken,s.durationMs,s.resourceEvents,
    s.mechanics,s.baseEquipmentStat,
   ].some(n=>!Number.isFinite(n)||n<0)||
   !Number.isSafeInteger(s.resourceEvents)||!Number.isSafeInteger(s.mechanics)||
   s.baseEquipmentStat<=0)
   reject('invalid_sample');
  const key=identity(s);
  if(seen.has(key))reject('duplicate_sample');
  seen.add(key);
  const bucket=groupKey(s);
  bands.set(bucket,[...(bands.get(bucket)??[]),s]);
  const pair=gearKey(s);
  matched.set(pair,[...(matched.get(pair)??[]),s]);
 }
 const findings:CombatV2BalanceFinding[]=[];
 const summary:CombatV2BalanceBand[]=[];
 const gearProgression:CombatV2BalanceDiagnostic['gearProgression'][number][]=[];
 for(const [key,rows] of [...bands.entries()].sort(([a],[b])=>a.localeCompare(b))){
  const dps=rows.map(s=>s.dps);
  const zeroDamageMatches=dps.filter(v=>v===0).length;
  const wins=rows.filter(s=>s.victory).length;
  const base=median(dps);
  const max=Math.max(...dps),min=Math.min(...dps);
  summary.push({
   group:key,matches:rows.length,wins,winRate:round(wins/rows.length),
   medianDps:round(base),medianHps:round(median(rows.map(s=>s.hps))),
   medianDamageTaken:round(median(rows.map(s=>s.damageTaken))),
   medianDurationMs:round(median(rows.map(s=>s.durationMs))),
   minDps:min,maxDps:max,zeroDamageMatches,
  });
  if(zeroDamageMatches>0)findings.push({
   type:'zero_damage',severity:'review',group:key,
   detail:zeroDamageMatches+'/'+rows.length+' zero-damage outcomes',
  });
  if(wins===0)findings.push({
   type:'no_wins_in_group',severity:'review',group:key,
   detail:'All '+rows.length+' synthetic encounters lost/timed out',
  });
  if(rows.every(s=>s.resourceEvents===0))findings.push({
   type:'no_resource_activity',severity:'review',group:key,
   detail:'No resource activity in this synthetic match group',
  });
  if(min>0&&max/min>3)findings.push({
   type:'role_spread',severity:'review',group:key,
   detail:'Max/min DPS ratio '+round(max/min)+'; requires class balance review',
  });
  if(rows[0].tier==='T1')findings.push({
   type:'t1_unverified',severity:'coverage_gap',group:key,
   detail:'T1 uses generic enemy bridge, not an authored Enemy V2 kit',
  });
 }
 for(const [key,rows] of [...matched.entries()].sort(([a],[b])=>a.localeCompare(b))){
  if(rows.length!==2||new Set(rows.map(s=>s.profile)).size!==2)
   reject('missing_quality_pair');
  const low=rows.find(s=>s.profile==='low')!;
  const high=rows.find(s=>s.profile==='high')!;
  if(high.baseEquipmentStat<=low.baseEquipmentStat)
   reject('nonmonotonic_verified_base_gear');
  if(high.dps<low.dps)findings.push({
   type:'dps_inversion',severity:'review',group:key,
   detail:'Q100 rare DPS '+high.dps+' below Q0 common '+low.dps,
  });
  gearProgression.push({
   group:key,lowBase:low.baseEquipmentStat,highBase:high.baseEquipmentStat,
   lowDps:low.dps,highDps:high.dps,
   dpsRatio:low.dps>0?round(high.dps/low.dps):null,
  });
 }
 return {
  provenance:'synthetic_unapproved_2_0',
  count:samples.length,bands:summary,findings,gearProgression,
 };
}
