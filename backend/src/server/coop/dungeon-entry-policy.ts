import type {ExpeditionDefinition} from '../expeditions/content/launch-content';
import {COOP_ROGUELITE_CONFIG,PUBLISHED_COOP_TIERS,coopRequiredLevel,readinessEligibleCoopTier,type CoopTier} from './config';

export const DUNGEON_UNLOCK_LEVEL=25;
export const DUNGEON_CHAPTER_ONE_BOSS='FALLEN_KNIGHT';
/** One queue per released region. Retired IDs still resolve historical runs. */
const ACTIVE_DUNGEONS=new Set(['EXP_001','EXP_003']);
const DEVELOPMENT_DUNGEONS=new Set(['EXP_005']);
export function publishedRegularDungeon(def:ExpeditionDefinition):boolean{
 return def.coopImplemented&&ACTIVE_DUNGEONS.has(def.id);
}
export function listedRegularDungeon(def:ExpeditionDefinition):boolean{
 return publishedRegularDungeon(def)||DEVELOPMENT_DUNGEONS.has(def.id);
}
/** The restored Asterfall dungeon unlocks at 25/30/35, not the old pre-rebase tier levels. */
export function regularDungeonTierRequiredLevel(def:ExpeditionDefinition,tier:CoopTier):number{
 if(def.id==='EXP_001')return DUNGEON_UNLOCK_LEVEL+(tier-1)*5;
 return Math.max(DUNGEON_UNLOCK_LEVEL,coopRequiredLevel(def.minLevel,tier));
}
export function highestEligibleRegularDungeonTier(def:ExpeditionDefinition,level:number):CoopTier|undefined{
 return [...PUBLISHED_COOP_TIERS].reverse().find(tier=>level>=regularDungeonTierRequiredLevel(def,tier));
}
export function regularDungeonReadyTier(def:ExpeditionDefinition,level:number,normalizedScore:number):CoopTier|undefined{
 const readiness=readinessEligibleCoopTier(def.minLevel,level,normalizedScore);
 if(!readiness||normalizedScore<COOP_ROGUELITE_CONFIG.normalizedReadinessFloor)return undefined;
 return [...PUBLISHED_COOP_TIERS].reverse().find(tier=>tier<=readiness&&level>=regularDungeonTierRequiredLevel(def,tier));
}
export function defeatedDungeonChapterBoss(state:{defeatedBossIds?:readonly string[]}|null|undefined):boolean{
 return Array.isArray(state?.defeatedBossIds)&&state.defeatedBossIds.includes(DUNGEON_CHAPTER_ONE_BOSS);
}
export type DungeonEntryError='dungeon_unavailable'|'dungeon_level_requirement'|'chapter_one_required';
export function regularDungeonEntryError(def:ExpeditionDefinition,state:{defeatedBossIds?:readonly string[]}|null|undefined,characterLevel:number):DungeonEntryError|undefined{
 if(!publishedRegularDungeon(def))return 'dungeon_unavailable';
 if(!Number.isInteger(characterLevel)||characterLevel<regularDungeonTierRequiredLevel(def,1))return 'dungeon_level_requirement';
 if(!defeatedDungeonChapterBoss(state))return 'chapter_one_required';
 return undefined;
}
export function regularDungeonLockedReason(def:ExpeditionDefinition,state:{defeatedBossIds?:readonly string[]}|null|undefined,characterLevel:number):string|undefined{
 const error=regularDungeonEntryError(def,state,characterLevel);
 if(!error)return undefined;
 if(error==='dungeon_unavailable')return DEVELOPMENT_DUNGEONS.has(def.id)||def.region==='Ashlands'?'In Development':'No longer available for new runs';
 if(error==='dungeon_level_requirement')return `Requires level ${regularDungeonTierRequiredLevel(def,1)}`;
 return 'Defeat the Fallen Knight (Chapter I) to unlock regional dungeons.';
}
