import {COMPANION_SERVER_DEFINITIONS,COMPANION_RARITY_MAX_LEVEL} from './content';

export type CompanionRole='damage'|'tank'|'support';
export type CompanionRarity='standard'|'rare'|'elite'|'prestige';
export type CharacterClassId='IRONWARDEN'|'BASTION'|'DREADGUARD'|'DAWNKEEPER'|'WAYFINDER'|'RAVAGER'|'HEXWEAVER'|'KNIFE_DANCER'|'STONECALLER';

export const CLASS_ROLE:Record<CharacterClassId,CompanionRole>={IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',DAWNKEEPER:'support',STONECALLER:'support',WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage'};
export const COMPANION_ROLE=Object.fromEntries(COMPANION_SERVER_DEFINITIONS.map(x=>[x.id,x.role])) as Record<string,CompanionRole>;
export const COMPANION_RARITY=Object.fromEntries(COMPANION_SERVER_DEFINITIONS.map(x=>[x.id,x.rarity])) as Record<string,CompanionRarity>;
export const RARITY_MAX_LEVEL=COMPANION_RARITY_MAX_LEVEL;
export const STAGE_CAPS:Record<CompanionRarity,readonly [number,number,number,number]>={standard:[10,20,20,20],rare:[10,20,25,25],elite:[10,20,25,30],prestige:[10,20,25,35]};
export const canEquipCompanion=(characterRole:CompanionRole,companionRole:CompanionRole)=>characterRole!==companionRole;

export interface AuthoritativeCompanionLoadoutInput{classId:CharacterClassId;companionId?:string|null;ownedCompanionIds:readonly string[];busyCompanionIds?:readonly string[];}
export function validateCompanionLoadout(input:AuthoritativeCompanionLoadoutInput){
  if(!input.companionId)return {ok:true as const,companionId:null};
  const role=COMPANION_ROLE[input.companionId];if(!role)return {ok:false as const,reason:'unknown_companion'};
  if(!input.ownedCompanionIds.includes(input.companionId))return {ok:false as const,reason:'companion_not_owned'};
  if(input.busyCompanionIds?.includes(input.companionId))return {ok:false as const,reason:'companion_busy'};
  const characterRole=CLASS_ROLE[input.classId];if(!characterRole)return {ok:false as const,reason:'unknown_character_class'};
  if(!canEquipCompanion(characterRole,role))return {ok:false as const,reason:'same_role_restricted'};
  return {ok:true as const,companionId:input.companionId};
}
export function sanitizePersistedCompanionLoadout(input:AuthoritativeCompanionLoadoutInput){const checked=validateCompanionLoadout(input);return checked.ok?checked.companionId:null;}
export function companionLevelCap(companionId:string,ascensionTier:number){const rarity=COMPANION_RARITY[companionId];if(!rarity)throw new Error('unknown_companion');const tier=Math.max(0,Math.min(3,Math.floor(ascensionTier)));return Math.min(RARITY_MAX_LEVEL[rarity],STAGE_CAPS[rarity][tier]);}
export function validateProgressionSnapshot(companionId:string,input:{level:number;xp:number;ascensionTier:number;bondLevel:number;bondXp:number;selectedTechniqueId?:string}){
  const rarity=COMPANION_RARITY[companionId];if(!rarity)throw new Error('unknown_companion');const ascensionTier=Math.max(0,Math.min(3,Math.floor(input.ascensionTier))),cap=companionLevelCap(companionId,ascensionTier);
  return {level:Math.max(1,Math.min(cap,RARITY_MAX_LEVEL[rarity],Math.floor(input.level))),xp:Math.max(0,Math.floor(input.xp)),ascensionTier,bondLevel:Math.max(1,Math.min(10,Math.floor(input.bondLevel))),bondXp:Math.max(0,Math.floor(input.bondXp)),selectedTechniqueId:input.selectedTechniqueId};
}
