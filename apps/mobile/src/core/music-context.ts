import {gatheringSceneBiome} from './gathering-scene';
import type {MusicTrackId} from '../theme/audio-assets';

/** Screens where the region's theme plays: the player is out in the world. */
const REGION_SCREENS=new Set(['World','Combat','Skills','Gathering','Crafting','Exploration','Bestiary']);
/** Dungeon browsing, co-op runs and the Arena share the dungeon theme. */
const DUNGEON_SCREENS=new Set(['Dungeon','Coop','Arena']);

/**
 * Background music for where the player is. Screens with their own drama (dungeons,
 * boss fights) push an override on top of this with useMusicOverride.
 */
export function backgroundMusicFor(input:{screen:string;regionId?:string|null;hasCharacter:boolean}):MusicTrackId{
 if(!input.hasCharacter)return 'town';
 if(DUNGEON_SCREENS.has(input.screen))return 'dungeon';
 if(!REGION_SCREENS.has(input.screen))return 'town';
 const biome=gatheringSceneBiome(input.regionId??undefined);
 return biome==='ashlands'?'dungeon':biome;
}
