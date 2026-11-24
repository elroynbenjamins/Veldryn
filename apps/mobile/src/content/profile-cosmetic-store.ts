import type {GameState} from '../core/types';
import {PROFILE_EFFECTS} from '../core/profile-effects';

export type ProfileCosmeticCollectionId='gloamward'|'frostbound'|'amberglass'|'briarbound';
export type ProfileCosmeticStoreProductKind='set';

export interface ProfileCosmeticSetPiece{
 kind:'border'|'effect';itemId:string;name:string;
}
export interface ProfileCosmeticStoreSet{
 sku:string;kind:'set';name:string;borderId:string;effectId:string;
}
export interface ProfileCosmeticStoreCollection{
 id:ProfileCosmeticCollectionId;name:string;tagline:string;description:string;accent:string;
 border:ProfileCosmeticSetPiece;effect:ProfileCosmeticSetPiece;set:ProfileCosmeticStoreSet;
 fallbackBorderId:string;checkoutEnabled:false;billing:'one_time';tier:'standard';
}

const META:Record<ProfileCosmeticCollectionId,{name:string;tagline:string;description:string;accent:string;slug:string}> = {
 gloamward:{name:'Gloamward',tagline:'Arcane lanternlight',description:'Purple crystal light, subtle lantern pulses and drifting arcane sparks.',accent:'#B998FF',slug:'gloamward'},
 frostbound:{name:'Frostbound Chime',tagline:'Winter crystal hush',description:'Icy glints with slow rotating snowflakes descending from the upper profile edge.',accent:'#D8F3FF',slug:'frostbound'},
 amberglass:{name:'Amberglass Loop',tagline:'Emberlit gold',description:'Warm amber highlights with sparse glowing shards rising through the profile scene.',accent:'#FFD58A',slug:'amberglass'},
 briarbound:{name:'Briarbound',tagline:'Living woodland',description:'Emerald accents, drifting leaves and quiet fireflies moving across the scene.',accent:'#9DE59A',slug:'briarbound'},
};
const KEY_BY_COLLECTION:Record<string,ProfileCosmeticCollectionId>={
 Gloamward:'gloamward','Frostbound Chime':'frostbound','Amberglass Loop':'amberglass',Briarbound:'briarbound',
};

export const PROFILE_COSMETIC_STORE_COLLECTIONS:readonly ProfileCosmeticStoreCollection[]=PROFILE_EFFECTS.map(base=>{
 const id=KEY_BY_COLLECTION[base.collection],meta=META[id];
 if(!id||!meta)throw new Error('profile_cosmetic_store_catalog_mismatch');
 return {
  id,name:meta.name,tagline:meta.tagline,description:meta.description,accent:meta.accent,
  fallbackBorderId:base.fallbackBorderId,checkoutEnabled:false as const,billing:'one_time' as const,tier:'standard' as const,
  border:{kind:'border' as const,itemId:base.borderId,name:base.borderName},
  effect:{kind:'effect' as const,itemId:base.id,name:base.name},
  set:{sku:`profile_cosmetic_${meta.slug}_set_v1`,kind:'set' as const,name:base.collection+' Set',borderId:base.borderId,effectId:base.id},
 };
});

/** These smaller standard collections are sold only as complete sets. */
export const PROFILE_COSMETIC_STORE_PRODUCTS=PROFILE_COSMETIC_STORE_COLLECTIONS.map(collection=>({
 ...collection.set,collectionId:collection.id,checkoutEnabled:false as const,billing:'one_time' as const,tier:'standard' as const,
}));

export function profileCosmeticCollectionOwnership(state:GameState,collection:ProfileCosmeticStoreCollection){
 const borderOwned=state.account.unlockedProfileBorderIds?.includes(collection.border.itemId)??false;
 const effectOwned=state.account.unlockedProfileEffectIds?.includes(collection.effect.itemId)??false;
 return {borderOwned,effectOwned,setOwned:borderOwned&&effectOwned,ownedPieces:Number(borderOwned)+Number(effectOwned)};
}
