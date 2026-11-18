/**
 * Class-only Combat 2.0 baseline boundary.
 *
 * A legacy launch-combat actor may contain class, item, buff, gem and/or
 * temporary battle contributions. No part of its stats, basic attacks,
 * ability definitions or equipment effects is copied into a 2.0 baseline.
 *
 * Source values must be registered in a server-owned versioned class profile.
 * This file deliberately does not choose level curves or class stat numbers.
 */
import type {AbilityDefinition,CombatantDefinition,CombatStats} from '../types';
import {CLASS_NAMES_V2} from './skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2,type VerifiedCharacterV2} from './build-contract';
import {RESOURCE_BY_CLASS_V2} from './resource-runtime';

export interface ApprovedClassProfileV2 {
 readonly classId:ClassIdV2;
 readonly minLevel:number;
 readonly maxLevel:number;
 /** Server-authored level curve; return a fresh class-only stat snapshot. */
 readonly statsAtLevel:(level:number)=>CombatStats;
 readonly basicAttackMs:number;
 readonly basicAttackCoeff:number;
 readonly abilities:readonly AbilityDefinition[];
}
export interface ApprovedClassBaselinePolicyV2 {
 readonly version:string;
 readonly profiles:Readonly<Partial<Record<ClassIdV2,ApprovedClassProfileV2>>>;
}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const statKeys:readonly (keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion',
 'critChance','critMultiplier','haste',
];
const cloneAbility=(a:AbilityDefinition):AbilityDefinition=>({
 ...a,effects:a.effects.map(e=>({...e})),
 tags:a.tags?[...a.tags]:undefined,
});
const reject=(reason:string):never=>{throw Error('combat_v2_baseline_'+reason);};
/**
 * Actor ID/name are the only reused fields from the combat participant.
 * All combat-effective fields are replaced by the trusted server profile.
 *
 * Caller must first authenticate ownership and independently load a verified
 * character class and level. This helper does not perform user authentication.
 */
export function issueClassOnlyActorV2(
 source:CombatantDefinition,
 verified:VerifiedCharacterV2,
 policy:ApprovedClassBaselinePolicyV2,
):CombatantDefinition{
 const classId=verified.classId;
 if(!policy||typeof policy.version!=='string'||!policy.version.trim())reject('policy_version_missing');
 if(!Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,classId)||
    source.team!=='players'||source.role!==CLASS_ROLES_V2[classId]||
    (source.classId!==classId&&source.classId!==CLASS_NAMES_V2[classId])||
    source.level!==verified.level||
    !source.id||!source.name)
   reject('actor_identity_mismatch');
 // An already-compiled or already-tagged actor must never pass for a new
 // level-only source. Generate a fresh, isolated actor each encounter.
 if(source.combatV2||source.tags?.some(t=>t.startsWith('combat-v2')))
   reject('source_already_compiled');
 const profile=policy.profiles[classId];
 if(!profile||profile.classId!==classId||!Number.isSafeInteger(profile.minLevel)||
    !Number.isSafeInteger(profile.maxLevel)||profile.minLevel<1||
    profile.maxLevel<profile.minLevel||
    !Number.isSafeInteger(verified.level)||verified.level<profile.minLevel||
    verified.level>profile.maxLevel)
   reject('approved_class_level_missing');
 if(typeof profile.statsAtLevel!=='function'||
    !Number.isSafeInteger(profile.basicAttackMs)||profile.basicAttackMs<400||
    !finite(profile.basicAttackCoeff)||profile.basicAttackCoeff<0||profile.basicAttackCoeff>5||
    !Array.isArray(profile.abilities)||profile.abilities.length<2)
   reject('invalid_profile');
 const stats=profile.statsAtLevel(verified.level);
 if(!stats||statKeys.some(key=>!finite(stats[key])||stats[key]<0)||
    stats.maxHp<=0||stats.critMultiplier<1||
    stats.critChance>1||stats.haste>2)
   reject('invalid_class_level_stats');
 const names=new Set<string>(),ids=new Set<string>();
 for(const a of profile.abilities){
  if(!a||!a.id||!a.name||ids.has(a.id)||names.has(a.name)||
     !Number.isFinite(a.cooldownMs)||a.cooldownMs<0||
     !Array.isArray(a.effects)||!a.effects.length)
    reject('invalid_authoritative_ability');
  ids.add(a.id);names.add(a.name);
 }
 // Avoid copying legacy effect gems, alchemy modifiers, boss data, tags or
 // equipment; those enter later through their separately verified adapters.
 return {
  id:source.id,name:source.name,
  classId:CLASS_NAMES_V2[classId],
  team:'players',role:CLASS_ROLES_V2[classId],level:verified.level,
  // Explicit allowlist, no unknown additional profile payload fields.
  stats:Object.fromEntries(statKeys.map(key=>[key,stats[key]])) as CombatStats,
  basicAttackMs:profile.basicAttackMs,
  basicAttackCoeff:profile.basicAttackCoeff,
  abilities:profile.abilities.map(cloneAbility),
  tags:['combat-v2-class-base-only'],
  combatV2:{
   version:2,resource:RESOURCE_BY_CLASS_V2[classId],
   specializationId:'pending_server_validated_build',
  },
 };
}
