import type {ClassId,SkillId} from './types';

export type AffinitySkillId=Extract<SkillId,'smithing'|'alchemy'|'fishing'|'woodcutting'|'enchanting'|'tailoring'|'herbalism'|'mining'>;
/** Combat identity is unchanged. Every class can still train every profession. */
export const CLASS_SKILL_AFFINITIES:Readonly<Record<ClassId,AffinitySkillId>>=Object.freeze({
 IRONWARDEN:'smithing',BASTION:'smithing',DREADGUARD:'alchemy',WAYFINDER:'fishing',
 RAVAGER:'woodcutting',HEXWEAVER:'enchanting',KNIFE_DANCER:'tailoring',
 DAWNKEEPER:'herbalism',STONECALLER:'mining',
});
export const CLASS_AFFINITY_XP_MULTIPLIER=1.05;
export const CLASS_AFFINITY_SPEED_MULTIPLIER=1.03;
export interface SkillAffinityMultipliers{readonly xpMultiplier:number;readonly speedMultiplier:number;}
const NEUTRAL:SkillAffinityMultipliers=Object.freeze({xpMultiplier:1,speedMultiplier:1});
const MATCHED:SkillAffinityMultipliers=Object.freeze({xpMultiplier:CLASS_AFFINITY_XP_MULTIPLIER,speedMultiplier:CLASS_AFFINITY_SPEED_MULTIPLIER});
const validClass=(value:unknown):value is ClassId=>typeof value==='string'&&Object.prototype.hasOwnProperty.call(CLASS_SKILL_AFFINITIES,value);
export function classSkillAffinity(classId:unknown):AffinitySkillId|undefined{return validClass(classId)?CLASS_SKILL_AFFINITIES[classId]:undefined;}
export function skillAffinityModifiers(classId:unknown,skillId:unknown):SkillAffinityMultipliers{
 return validClass(classId)&&CLASS_SKILL_AFFINITIES[classId]===skillId?MATCHED:NEUTRAL;
}
export function classSkillAffinityLabel(classId:unknown):string{
 const skill=classSkillAffinity(classId);return skill?`${skill[0].toUpperCase()}${skill.slice(1)} · +5% XP · +3% speed`:'';
}

export interface SkillAffinitySnapshot extends SkillAffinityMultipliers{
 version:1;ownerCharacterId:string;classId:ClassId;skillId:AffinitySkillId;
}
interface AffinityHost{character?:{id:string;classId:ClassId}|null;activity?:{skillAffinity?:SkillAffinitySnapshot}|null;}
/** Capture at start/reservation. Existing work without a snapshot retains its original rates. */
export function captureSkillAffinity(state:AffinityHost,skillId:unknown):SkillAffinitySnapshot|undefined{
 const c=state.character;if(!c||classSkillAffinity(c.classId)!==skillId)return undefined;
 return {version:1,ownerCharacterId:c.id,classId:c.classId,skillId:skillId as AffinitySkillId,...MATCHED};
}
export function normalizeSkillAffinitySnapshot(value:unknown):SkillAffinitySnapshot|undefined{
 if(!value||typeof value!=='object')return undefined;
 const s=value as Partial<SkillAffinitySnapshot>;
 if(s.version!==1||!validClass(s.classId)||CLASS_SKILL_AFFINITIES[s.classId]!==s.skillId||typeof s.ownerCharacterId!=='string'||!s.ownerCharacterId||s.ownerCharacterId.length>160||s.xpMultiplier!==CLASS_AFFINITY_XP_MULTIPLIER||s.speedMultiplier!==CLASS_AFFINITY_SPEED_MULTIPLIER)return undefined;
 return {version:1,ownerCharacterId:s.ownerCharacterId,classId:s.classId,skillId:s.skillId!,...MATCHED};
}
export function activeSkillAffinity(state:AffinityHost,skillId:unknown):SkillAffinityMultipliers{
 const s=normalizeSkillAffinitySnapshot(state.activity?.skillAffinity);
 return s&&s.ownerCharacterId===state.character?.id&&s.classId===state.character?.classId&&s.skillId===skillId?s:NEUTRAL;
}
/** Owner-scoped keys prevent fractional XP from migrating to another roster character. */
export function affinityXpRemainderKey(ownerCharacterId:string,skillId:string){return `xp:affinity:${encodeURIComponent(ownerCharacterId)}:${skillId}`;}
export function settleAffinitySkillXp(rawXp:number,remainder=0,remainingXp=Number.MAX_SAFE_INTEGER){
 if(!Number.isFinite(rawXp)||rawXp<0)throw new Error('Invalid profession XP.');
 const carry=Number.isFinite(remainder)&&remainder>=0&&remainder<1?remainder:0;
 const room=Number.isFinite(remainingXp)?Math.max(0,Math.floor(remainingXp)):Number.MAX_SAFE_INTEGER;
 const raw=rawXp+carry,whole=Math.floor(raw+1e-9),xp=Math.min(whole,room);
 return {xp,remainder:xp>=room?0:Math.max(0,Math.min(1-Number.EPSILON,raw-whole))};
}
