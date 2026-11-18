/**
 * Staging gate for the complete nine-class Combat 2.0 baseline registry.
 *
 * No class can ship relying on a missing curve, stale profile revision or
 * substituted legacy combat stats. The list of required levels is provided
 * by the server's approved progression contract, not inferred here.
 */
import type {CombatStats} from '../types';
import {CLASS_ROLES_V2,type ClassIdV2} from './build-contract';
import type {ApprovedClassBaselinePolicyV2} from './class-baseline';

export interface ClassBaselineAuditIssueV2{
 readonly classId:ClassIdV2;
 readonly level?:number;
 readonly code:string;
}
export interface ClassBaselineAuditV2{
 readonly version:string;
 readonly classesChecked:number;
 readonly levelsChecked:number;
 readonly valid:boolean;
 readonly issues:readonly ClassBaselineAuditIssueV2[];
}
const stats:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion',
 'critChance','critMultiplier','haste',
];
const finite=(value:unknown)=>typeof value==='number'&&Number.isFinite(value);
/** Pure audited QA check. Never materialize player character records here. */
export function auditApprovedClassBaselinesV2(
 policy:ApprovedClassBaselinePolicyV2,
 requiredLevels:readonly number[],
):ClassBaselineAuditV2{
 if(!policy||typeof policy.version!=='string'||!policy.version.trim())
   throw Error('combat_v2_baseline_audit_version_required');
 if(!Array.isArray(requiredLevels)||requiredLevels.length===0||
    requiredLevels.some(level=>!Number.isSafeInteger(level)||level<1)||
    new Set(requiredLevels).size!==requiredLevels.length)
   throw Error('combat_v2_baseline_audit_invalid_levels');
 const issues:ClassBaselineAuditIssueV2[]=[];
 const ids=Object.keys(CLASS_ROLES_V2) as ClassIdV2[];
 let checked=0;
 for(const classId of ids){
   const profile=policy.profiles[classId];
   if(!profile){issues.push({classId,code:'missing_class_profile'});continue;}
   if(profile.classId!==classId||
      !Number.isSafeInteger(profile.minLevel)||!Number.isSafeInteger(profile.maxLevel)||
      profile.minLevel<1||profile.maxLevel<profile.minLevel||
      !Number.isSafeInteger(profile.basicAttackMs)||profile.basicAttackMs<400||
      !finite(profile.basicAttackCoeff)||profile.basicAttackCoeff<0||profile.basicAttackCoeff>5||
      !Array.isArray(profile.abilities)||profile.abilities.length<2||
      typeof profile.statsAtLevel!=='function'){
     issues.push({classId,code:'invalid_class_profile'});continue;
   }
   const abilities=new Set(profile.abilities.map(a=>a.id));
   const names=new Set(profile.abilities.map(a=>a.name));
   if(abilities.size!==profile.abilities.length||
      names.size!==profile.abilities.length||
      profile.abilities.some(a=>!a.id||!a.name||!Array.isArray(a.effects)||a.effects.length===0)){
     issues.push({classId,code:'invalid_class_abilities'});continue;
   }
   for(const level of requiredLevels){
     checked++;
     if(level<profile.minLevel||level>profile.maxLevel){
       issues.push({classId,level,code:'missing_level_curve'});continue;
     }
     let current:CombatStats;
     try{current=profile.statsAtLevel(level);}
     catch{issues.push({classId,level,code:'class_curve_threw'});continue;}
     if(!current||stats.some(k=>!finite(current[k])||current[k]<0)||
        current.maxHp<=0||current.critMultiplier<1||
        current.critChance>1||current.haste>2){
       issues.push({classId,level,code:'invalid_class_curve_stats'});
       continue;
     }
     // The same class/level must create byte-stable combat stats on every
     // replay. Never accept randomness, clock-based bonuses or mutation.
     try{
       const repeated=profile.statsAtLevel(level);
       if(!repeated||stats.some(k=>repeated[k]!==current[k]))
         issues.push({classId,level,code:'non_deterministic_class_curve'});
     }catch{
       issues.push({classId,level,code:'class_curve_threw_on_repeat'});
     }
   }
 }
 return {version:policy.version,classesChecked:ids.length,
   levelsChecked:checked,valid:issues.length===0,issues};
}
/** Fail-closed staging gate: QA may inspect issues, production must never
 * auto-fill a missing class with another class's defaults.
 */
export function assertApprovedClassBaselineCoverageV2(
 policy:ApprovedClassBaselinePolicyV2,requiredLevels:readonly number[],
):void{
 const report=auditApprovedClassBaselinesV2(policy,requiredLevels);
 if(!report.valid)
   throw Error('combat_v2_class_baseline_coverage_failed:'+report.issues
     .map(x=>x.classId+':'+(x.level??'all')+':'+x.code).join(','));
}
