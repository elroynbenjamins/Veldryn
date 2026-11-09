import type {ExpeditionDefinition} from '../expeditions/content/launch-content';
import {rebaseLegacyCombatLevel} from './config';

export const DUNGEON_UNLOCK_LEVEL=25;
export const DUNGEON_CHAPTER_ONE_BOSS='FALLEN_KNIGHT';

/** Asterfall dungeons remain as historical content for existing saved runs and
 * reward receipts, but cannot be selected for a new Q-Mode/Live/Quick Match run. */
export function publishedRegularDungeon(def:ExpeditionDefinition):boolean{
 return def.coopImplemented&&def.region!=='Asterfall';
}

/** Use the current character's Chapter I boss record, never another character
 * on the account. This is the same authority used by the Sunscar travel gate. */
export function defeatedDungeonChapterBoss(state:{defeatedBossIds?:readonly string[]}|null|undefined):boolean{
 return Array.isArray(state?.defeatedBossIds)&&state.defeatedBossIds.includes(DUNGEON_CHAPTER_ONE_BOSS);
}

export type DungeonEntryError='dungeon_unavailable'|'dungeon_level_requirement'|'chapter_one_required';
export function regularDungeonEntryError(
 def:ExpeditionDefinition,
 state:{defeatedBossIds?:readonly string[]}|null|undefined,
 characterLevel:number,
):DungeonEntryError|undefined{
 if(!publishedRegularDungeon(def))return 'dungeon_unavailable';
 if(!Number.isInteger(characterLevel)||characterLevel<Math.max(DUNGEON_UNLOCK_LEVEL,rebaseLegacyCombatLevel(def.minLevel)))return 'dungeon_level_requirement';
 if(!defeatedDungeonChapterBoss(state))return 'chapter_one_required';
 return undefined;
}
export function regularDungeonLockedReason(
 def:ExpeditionDefinition,
 state:{defeatedBossIds?:readonly string[]}|null|undefined,
 characterLevel:number,
):string|undefined{
 const error=regularDungeonEntryError(def,state,characterLevel);
 if(!error)return undefined;
 if(error==='dungeon_unavailable')return def.region==='Ashlands'?'In Development':'Not yet available';
 if(error==='dungeon_level_requirement')return `Requires level ${Math.max(DUNGEON_UNLOCK_LEVEL,rebaseLegacyCombatLevel(def.minLevel))}`;
 return 'Defeat the Fallen Knight (Chapter I) to unlock Sunscar dungeons.';
}
