import type {GameState} from './types';
import {ASCENDANT_CELESTIAL_VISUALS_RELEASED} from './release-flags';

export const CELESTIAL_IDS={
 background:'ascendant-celestial-astral-sanctum',
 border:'ascendant-celestial-crown-of-the-cosmos',
 pet:'ascendant-celestial-aetherion',
 showcase:'ascendant-celestial-alignment',
 badge:'ascendant-celestial-sovereign-of-the-stars',
} as const;

export const CELESTIAL_COLLECTION={
 id:'ascendant-celestial-sovereign',
 name:'Celestial Sovereign',
 backgroundName:'Astral Sanctum',
 borderName:'Crown of the Cosmos',
 petName:'Aetherion, the Starborn',
 showcaseName:'Celestial Alignment',
 badgeName:'Sovereign of the Stars',
} as const;

/** Ascendant cosmetics deliberately do not enter the legacy COLLECTIBLES bonus catalogue. */
export function ownsCelestialPet(state:GameState){
 return (state.account.unlockedCosmeticPetIds??[]).includes(CELESTIAL_IDS.pet);
}
export function releasedCelestialPetWardrobeDefinition(state:GameState){
 if(!ASCENDANT_CELESTIAL_VISUALS_RELEASED||!ownsCelestialPet(state))return null;
 return {id:CELESTIAL_IDS.pet,name:CELESTIAL_COLLECTION.petName,group:'Ascendant'} as const;
}
export function isCelestialBackground(id:string){return id===CELESTIAL_IDS.background;}
export function isCelestialBorder(id:string){return id===CELESTIAL_IDS.border;}
