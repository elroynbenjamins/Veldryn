/** HIDDEN review-only role calibration. Observations are not CP and must not
 * be used as matchmaking authority. Same-boss, same-role peers only; do not
 * compare raw healer DPS with damage or tank damage taken with support. */
import type {CombatResult} from '../types';
import {CLASS_ROLES_V2,type ClassIdV2} from './build-contract';
import {SPECIALIZATIONS_V2} from './skill-catalog';

export interface RoleCalibrationIdentityV2{
 readonly caseId:string;readonly bossId:string;readonly classId:ClassIdV2;
 readonly specializationId:string;readonly actorId:string;
}
const metrics=['damagePerSecond','effectiveHealingPerSecond','survivingHpFraction',
 'shieldGrantedPerSecond','interruptsPerSecond','cleanseEventsPerSecond'] as const;
type Metric=typeof metrics[number];
type Role=typeof CLASS_ROLES_V2[ClassIdV2];
type Vector=Record<Metric,number>;
export interface RoleCalibrationObservationV2 extends RoleCalibrationIdentityV2{
 readonly role:Role;readonly values:Vector;readonly victory:boolean;
 readonly incomingHpDamage:number;readonly downed:boolean;
}
const fail=(x:string):never=>{throw Error('combat_v2_role_calibration_'+x);};
const finite=(n:number)=>Number.isFinite(n)&&n>=0;
export function observeRoleCalibrationV2(result:CombatResult,identity:RoleCalibrationIdentityV2):RoleCalibrationObservationV2{
 const role=CLASS_ROLES_V2[identity.classId];
 const actor=result.players.find(p=>p.definition.id===identity.actorId);
 if(!role||!actor||actor.definition.role!==role||!identity.caseId||!identity.bossId||
   !SPECIALIZATIONS_V2.some(s=>s.id===identity.specializationId&&s.classId===identity.classId)||
   !result.enemies.some(e=>e.definition.id===identity.bossId)||!finite(result.durationMs)||result.durationMs<=0||
   !finite(actor.definition.stats.maxHp)||actor.definition.stats.maxHp<=0)
  throw Error('combat_v2_role_calibration_identity_or_duration');
 const seconds=result.durationMs/1000;
 const events=result.events.filter(e=>e.actorId===identity.actorId);
 // Shield creation is NOT mitigation or actual absorption; keep the name
 // explicit. Incoming HP damage is exposure, never a positive score reward.
 const values:Vector={
  damagePerSecond:actor.damageDone/seconds,
  effectiveHealingPerSecond:actor.healingDone/seconds,
  survivingHpFraction:Math.min(1,actor.hp/actor.definition.stats.maxHp),
  shieldGrantedPerSecond:events.filter(e=>e.type==='shield').reduce((n,e)=>n+(e.amount??0),0)/seconds,
  interruptsPerSecond:events.filter(e=>e.type==='interrupt').length/seconds,
  cleanseEventsPerSecond:events.filter(e=>e.type==='status_remove'&&
   (e.statusKind==='dot'||e.statusKind==='debuff')&&e.targetId!==undefined&&
   result.players.some(p=>p.definition.id===e.targetId)).length/seconds,
 };
 if(!metrics.every(k=>finite(values[k]))||!finite(actor.damageTaken))fail('invalid_metrics');
 return {...identity,role,values,victory:result.victory,incomingHpDamage:actor.damageTaken,downed:actor.downed};
}
const round=(n:number)=>Math.round(n*1e6)/1e6;
const mean=(xs:number[])=>xs.reduce((n,x)=>n+x,0)/xs.length;
/** Equal weight per class/spec mean within each role/boss stratum, rather than
 * giving extra influence to classes appearing in more recorded parties.
 * A zero peer mean has no usable ratio. No arbitrary role weights here. */
export function summarizeRoleCalibrationV2(observations:readonly RoleCalibrationObservationV2[]){
 if(!observations.length)fail('empty');
 const ids=new Set<string>(),groups=new Map<string,RoleCalibrationObservationV2[]>();
 for(const row of observations){
  const id=row.caseId+'|'+row.actorId;
  if(ids.has(id)||CLASS_ROLES_V2[row.classId]!==row.role||
   !SPECIALIZATIONS_V2.some(s=>s.id===row.specializationId&&s.classId===row.classId)||
   !metrics.every(k=>finite(row.values[k]))||!finite(row.incomingHpDamage))fail('duplicate_or_invalid_observation');
  ids.add(id);
  const key=[row.bossId,row.role,row.classId,row.specializationId].join('|');
  groups.set(key,[...(groups.get(key)??[]),row]);
 }
 const cells=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,rows])=>{
  const stable=[...rows].sort((a,b)=>a.caseId.localeCompare(b.caseId));
  const first=stable[0];
  const means=Object.fromEntries(metrics.map(k=>[k,mean(stable.map(r=>r.values[k]))])) as Vector;
  return {key,bossId:first.bossId,role:first.role,classId:first.classId,specializationId:first.specializationId,
   cases:rows.length,means,victoryRate:mean(stable.map(r=>Number(r.victory))),
   downedRate:mean(stable.map(r=>Number(r.downed))),meanIncomingHpDamage:mean(stable.map(r=>r.incomingHpDamage))};
 });
 const comparisons=cells.map(cell=>{
  const peers=cells.filter(c=>c.bossId===cell.bossId&&c.role===cell.role);
  const ratios=Object.fromEntries(metrics.map(k=>{
   const reference=mean(peers.map(p=>p.means[k]));
   return [k,reference>0?round(cell.means[k]/reference):null];
  }));
  return {...cell,peerClassSpecs:peers.length,ratios};
 });
 return {observations:observations.length,cells:comparisons,
  scope:'SAME_ROLE_BOSS_OBSERVATIONAL_REVIEW' as const,
  limitations:['synthetic_gear','mixed_teammate_compositions','shield_grants_not_absorption',
   'cleanse_trace_not_causal_value','no_equal_cp_or_cross_role_normalization'] as const,
  cpApproved:false as const,releaseEnabled:false as const};
}
