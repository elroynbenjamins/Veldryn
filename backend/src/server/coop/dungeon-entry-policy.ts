import type {ExpeditionDefinition} from '../expeditions/content/launch-content';
import {COOP_ROGUELITE_CONFIG,PUBLISHED_COOP_TIERS,type CoopTier} from './config';

/** Requirements refer to the character-sheet Combat Power rating, not the
 * separate normalized Dungeon Power metric used for matchmaking similarity. */
export const DUNGEON_UNLOCK_LEVEL=10;
export const DUNGEON_CHAPTER_ONE_BOSS='FALLEN_KNIGHT';
const DUNGEON_REQUIREMENTS:Readonly<Record<string,{minLevel:number;powers:readonly [number,number,number];requiresChapterOne:boolean}>>=Object.freeze({
 EXP_001:{minLevel:10,powers:[2500,3750,5000],requiresChapterOne:false},
 EXP_003:{minLevel:25,powers:[6000,7250,8500],requiresChapterOne:true},
});
const DEVELOPMENT_DUNGEONS=new Set(['EXP_005']);
export function publishedRegularDungeon(def:ExpeditionDefinition):boolean{return def.coopImplemented&&Boolean(DUNGEON_REQUIREMENTS[def.id]);}
export function listedRegularDungeon(def:ExpeditionDefinition):boolean{return publishedRegularDungeon(def)||DEVELOPMENT_DUNGEONS.has(def.id);}
export function regularDungeonTierRequiredLevel(def:ExpeditionDefinition,tier:CoopTier):number{
 if(!PUBLISHED_COOP_TIERS.some(value=>value===tier))throw new Error('dungeon_difficulty_unavailable');
 return DUNGEON_REQUIREMENTS[def.id]?.minLevel??Math.max(DUNGEON_UNLOCK_LEVEL,def.minLevel);
}
export function regularDungeonTierRequiredPower(def:ExpeditionDefinition,tier:CoopTier):number{
 if(!PUBLISHED_COOP_TIERS.some(value=>value===tier))throw new Error('dungeon_difficulty_unavailable');
 return DUNGEON_REQUIREMENTS[def.id]?.powers[tier-1]??0;
}
export function highestEligibleRegularDungeonTier(def:ExpeditionDefinition,level:number,combatPower=Number.POSITIVE_INFINITY):CoopTier|undefined{
 if(!publishedRegularDungeon(def)||!Number.isInteger(level))return undefined;
 return [...PUBLISHED_COOP_TIERS].reverse().find(tier=>level>=regularDungeonTierRequiredLevel(def,tier)&&combatPower>=regularDungeonTierRequiredPower(def,tier));
}
export function regularDungeonReadyTier(def:ExpeditionDefinition,level:number,normalizedScore:number,combatPower=0):CoopTier|undefined{
 if(!Number.isFinite(normalizedScore)||normalizedScore<COOP_ROGUELITE_CONFIG.normalizedReadinessFloor)return undefined;
 return highestEligibleRegularDungeonTier(def,level,combatPower);
}
export function defeatedDungeonChapterBoss(state:{defeatedBossIds?:readonly string[]}|null|undefined):boolean{
 return Array.isArray(state?.defeatedBossIds)&&state.defeatedBossIds.includes(DUNGEON_CHAPTER_ONE_BOSS);
}
export type DungeonEntryError='dungeon_unavailable'|'dungeon_level_requirement'|'chapter_one_required'|'dungeon_power_requirement';
export function regularDungeonEntryError(def:ExpeditionDefinition,state:{defeatedBossIds?:readonly string[]}|null|undefined,characterLevel:number,combatPower=Number.POSITIVE_INFINITY,tier:CoopTier=1):DungeonEntryError|undefined{
 const rule=DUNGEON_REQUIREMENTS[def.id];
 if(!publishedRegularDungeon(def)||!rule)return 'dungeon_unavailable';
 if(!Number.isInteger(characterLevel)||characterLevel<regularDungeonTierRequiredLevel(def,tier))return 'dungeon_level_requirement';
 if(rule.requiresChapterOne&&!defeatedDungeonChapterBoss(state))return 'chapter_one_required';
 if(combatPower<regularDungeonTierRequiredPower(def,tier)||(!Number.isFinite(combatPower)&&combatPower!==Number.POSITIVE_INFINITY))return 'dungeon_power_requirement';
 return undefined;
}
export function regularDungeonLockedReason(def:ExpeditionDefinition,state:{defeatedBossIds?:readonly string[]}|null|undefined,level:number,combatPower=Number.POSITIVE_INFINITY):string|undefined{
 const error=regularDungeonEntryError(def,state,level,combatPower);
 if(!error)return undefined;
 if(error==='dungeon_unavailable')return DEVELOPMENT_DUNGEONS.has(def.id)||def.region==='Ashlands'?'In Development':'No longer available for new runs';
 if(error==='dungeon_level_requirement')return `Requires level ${regularDungeonTierRequiredLevel(def,1)}`;
 if(error==='dungeon_power_requirement')return `Requires ${regularDungeonTierRequiredPower(def,1).toLocaleString('en-US')} Combat Power`;
 return 'Defeat the Fallen Knight (Chapter I) to unlock Sunscar dungeons.';
}
