/** Review-only validation of static CP ordering against observed combat.
 * Compare only within a role AND boss, with no cross-role or live CP claims.
 * The observed axes remain separate; do not invent a composite outcome.
 */
import type {RoleV2} from './build-contract';
const axes=['damagePerSecond','effectiveHealingPerSecond','survivingHpFraction','shieldGrantedPerSecond','interruptsPerSecond','cleanseEventsPerSecond'] as const;
type Axis=typeof axes[number];
export interface CandidatePowerCalibrationRowV2 {
 readonly scenarioId:string;readonly bossId:string;readonly role:RoleV2;
 readonly equipped:number;
 readonly observedSidecarOff:Readonly<Record<Axis,number>>;
}
const fail=()=>{throw Error('combat_v2_candidate_calibration_invalid_row');};
export function summarizeCandidatePowerCalibrationV2(rows:readonly CandidatePowerCalibrationRowV2[]){
 if(!rows.length)fail();
 const seen=new Set<string>(),groups=new Map<string,CandidatePowerCalibrationRowV2[]>();
 for(const r of rows){
  if(!r.scenarioId||!r.bossId||!['tank','damage','support'].includes(r.role)||seen.has(r.scenarioId)||
   !Number.isSafeInteger(r.equipped)||r.equipped<0||!r.observedSidecarOff||
   axes.some(a=>!Number.isFinite(r.observedSidecarOff[a])||r.observedSidecarOff[a]<0))fail();
  seen.add(r.scenarioId);
  const key=JSON.stringify([r.bossId,r.role]);
  const group=groups.get(key);
  if(group)group.push(r);else groups.set(key,[r]);
 }
 const strata=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,group])=>{
  const stable=[...group].sort((a,b)=>a.scenarioId.localeCompare(b.scenarioId));
  const metrics=axes.map(axis=>{
   let concordant=0,discordant=0,scoreTies=0,outcomeTies=0,bothTies=0;
   for(let i=0;i<stable.length;i++)for(let j=i+1;j<stable.length;j++){
    const a=stable[i],b=stable[j];
    const score=Math.sign(a.equipped-b.equipped),outcome=Math.sign(a.observedSidecarOff[axis]-b.observedSidecarOff[axis]);
    if(!score&&!outcome)bothTies++;
    else if(!score)scoreTies++;
    else if(!outcome)outcomeTies++;
    else if(score===outcome)concordant++;
    else discordant++;
   }
   const comparable=concordant+discordant;
   return {axis,concordant,discordant,scoreTies,outcomeTies,bothTies,comparable,
    agreement:comparable?Math.round(concordant/comparable*1e6)/1e6:null};
  });
  return {bossId:stable[0].bossId,role:stable[0].role,cases:stable.length,metrics};
 });
 return {scope:'STATIC_POWER_ORDERING_SAME_ROLE_BOSS_SIDECAR_OFF' as const,cases:rows.length,strata,
  equalCpVerified:false as const,cpApproved:false as const,canGateContent:false as const,releaseEnabled:false as const};
}
