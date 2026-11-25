import type {GameState} from './types';

/** Ultra-luxe profile cosmetics are private/account-granted.
 * They are never advertised as locked/released wardrobe entries.
 * Presence in the client bundle is only for rendering profiles of accounts that own them.
 *
 * Add future ultra-luxe collections here as their IDs are authored.
 */
const ULTRA_LUXE_PROFILE_BACKGROUND_IDS=new Set<string>([
 'ascendant-celestial-astral-sanctum','ascendant-draconic-dominion-of-ash',
]);
const ULTRA_LUXE_PROFILE_BORDER_IDS=new Set<string>([
 'ascendant-celestial-crown-of-the-cosmos','ascendant-draconic-throne-of-embers',
]);
const ULTRA_LUXE_PET_IDS=new Set<string>([
 'ascendant-celestial-aetherion','ascendant-draconic-vharaxis',
]);
const ULTRA_LUXE_BADGE_IDS=new Set<string>([
 'ascendant_sovereign_of_stars','ascendant_dragon_sovereign','ascendant_monarch_of_deep','ascendant_beyond_existence',
]);

export type UltraLuxeProfileKind='background'|'border'|'pet';

export function isUltraLuxeProfileCosmetic(kind:UltraLuxeProfileKind,id:string){
 const set=kind==='background'?ULTRA_LUXE_PROFILE_BACKGROUND_IDS:kind==='border'?ULTRA_LUXE_PROFILE_BORDER_IDS:ULTRA_LUXE_PET_IDS;
 return set.has(id);
}
export function ownsUltraLuxeProfileCosmetic(state:GameState,kind:UltraLuxeProfileKind,id:string){
 if(!isUltraLuxeProfileCosmetic(kind,id))return false;
 const owned=kind==='background'?state.account.unlockedProfileBackgroundIds
  :kind==='border'?state.account.unlockedProfileBorderIds
  :state.account.unlockedCosmeticPetIds;
 return owned?.includes(id)??false;
}
export function isUltraLuxeBadge(id:string){return ULTRA_LUXE_BADGE_IDS.has(id);}

/** Wardrobe discovery rule: an ultra-luxe item is invisible until the account owns it. */
export function ultraLuxeProfileCosmeticVisible(state:GameState,kind:UltraLuxeProfileKind,id:string){
 return !isUltraLuxeProfileCosmetic(kind,id)||ownsUltraLuxeProfileCosmetic(state,kind,id);
}
