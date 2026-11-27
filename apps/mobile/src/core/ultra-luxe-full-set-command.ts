/** Dedicated combined-equipment command contract. No client-supplied state, colors,
 * account ID, gold, arbitrary wardrobe patch or service credentials. */
import {ultraLuxeFullSetNamePreset,planUltraLuxeFullSet,type FullSetScope,type VerifiedFullSetNames,type FullSetPlan} from './ultra-luxe-full-set-name';
import type {GameState} from './types';
import type {WardrobeEquipped} from './profile-wardrobe';
import type {GameCommand} from './game-commands';
export const ULTRA_LUXE_FULL_SET_COMMAND='ultra_luxe_full_set';
export const ULTRA_LUXE_REQUEST_PREFIX='luxe_full_set_';
export function canonicalUltraLuxeCollection(id:unknown){
 if(typeof id!=='string'||!ultraLuxeFullSetNamePreset(id))return undefined;
 return id.startsWith('ascendant-')?id:'ascendant-'+id;
}
export function ultraLuxeFullSetCommand(plan:FullSetPlan):GameCommand{
 const collectionId=canonicalUltraLuxeCollection(plan.setId);
 if(!collectionId||!plan.scope.characterId||!plan.scope.accountId)throw Error('invalid_full_set_plan');
 return {type:ULTRA_LUXE_FULL_SET_COMMAND,args:{collectionId,characterId:plan.scope.characterId,expectedNameId:plan.before.namePresetId}};
}
export function fullSetRequestId(key:string){
 if(!/^[A-Za-z0-9_-]{16,80}$/.test(key))throw Error('invalid_full_set_request_key');
 return ULTRA_LUXE_REQUEST_PREFIX+key;
}

export const ULTRA_LUXE_FULL_SET_DEFINITIONS=[
 ['ascendant-celestial-sovereign','ascendant-celestial-astral-sanctum','ascendant-celestial-crown-of-the-cosmos','ascendant-celestial-aetherion','Sovereign of the Stars'],
 ['ascendant-draconic-dominion','ascendant-draconic-dominion-of-ash','ascendant-draconic-throne-of-embers','ascendant-draconic-vharaxis','Dragon Sovereign'],
 ['ascendant-abyssal-majesty','ascendant-abyssal-forgotten-abyss','ascendant-abyssal-crown-of-the-depths','ascendant-abyssal-nhalzuun','Monarch of the Deep'],
 ['ascendant-paradox-eternal','ascendant-paradox-beyond-the-veil','ascendant-paradox-fractured-eternity','ascendant-paradox-aeon','Beyond Existence'],
 ['ascendant-sakura-enchantment','ascendant-sakura-petal-sanctuary','ascendant-sakura-blossom-crown','ascendant-sakura-spirit-fox','Sakura Dreamkeeper'],
 ['ascendant-stormforged-sovereign','ascendant-stormforged-thunderkeep','ascendant-stormforged-steel-crown','ascendant-stormforged-direwolf','Stormforged Warden'],
] as const;
/** Canonical dedicated pieces only. Legacy mixed aliases remain individual equips. */
export function verifiedUltraLuxeFullSetPlan(state:GameState,scope:FullSetScope,setId:string,current:WardrobeEquipped,names:VerifiedFullSetNames|undefined){
 const def=ULTRA_LUXE_FULL_SET_DEFINITIONS.find(d=>d[0]===canonicalUltraLuxeCollection(setId));
 if(!def||state.character?.id!==scope.characterId)return null;
 const [id,scene,frame,pet,title]=def;
 const a=state.account,stem=id.split('-')[1];
 if(!a.unlockedProfileBackgroundIds?.includes(scene)||!a.unlockedProfileBorderIds?.includes(frame)||
  !a.unlockedCosmeticPetIds?.includes(pet)||!a.unlockedTitleIds?.includes('ascendant-'+stem+'-title'))return null;
 return planUltraLuxeFullSet(scope,id,current,{...current,scene,frame,pet,title,effect:''},names);
}
