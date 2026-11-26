import {gatheringSceneBiome} from './gathering-scene';
import type {MusicContextId} from './audio-preferences';

/** Dungeon browsing, co-op runs and the Arena share the dungeon theme. */
const DUNGEON_SCREENS=new Set(['Dungeon','Coop','Arena']);

/**
 * Background music for where the player is. Screens with their own drama (dungeons,
 * boss fights) push an override on top of this with useMusicOverride.
 */
export function backgroundMusicFor(input:{screen:string;regionId?:string|null;hasCharacter:boolean}):MusicContextId{
 // Once a character is selected, every regular screen (including Home and menus)
 // follows their current region. This also prevents track restarts on tab changes.
 if(!input.hasCharacter)return 'asterfall';
 if(DUNGEON_SCREENS.has(input.screen))return 'dungeon';
 const biome=gatheringSceneBiome(input.regionId??undefined);
 return biome==='ashlands'?'dungeon':biome;
}
