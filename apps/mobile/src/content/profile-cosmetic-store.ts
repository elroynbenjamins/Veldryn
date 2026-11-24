import type {GameState} from '../core/types';
import {PROFILE_EFFECTS} from '../core/profile-effects';

export type ProfileCosmeticCollectionId='gloamward'|'frostbound'|'amberglass'|'briarbound';
export type ProfileCosmeticStoreProductKind='border'|'effect'|'bundle';

export interface ProfileCosmeticStorePiece{
 sku:string;kind:'border'|'effect';itemId:string;name:string;
}
export interface ProfileCosmeticStoreBundle{
 sku:string;kind:'bundle';name:string;borderId:string;effectId:string;
}
export interface ProfileCosmeticStoreCollection{
 id:ProfileCosmeticCollectionId;name:string;tagline:string;description:string;accent:string;
 border:ProfileCosmeticStorePiece;effect:ProfileCosmeticStorePiece;bundle:ProfileCosmeticStoreBundle;
 fallbackBorderId:string;checkoutEnabled:false;billing:'one_time';
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
  fallbackBorderId:base.fallbackBorderId,checkoutEnabled:false as const,billing:'one_time' as const,
  border:{sku:`profile_cosmetic_${meta.slug}_border_v1`,kind:'border' as const,itemId:base.borderId,name:base.borderName},
  effect:{sku:`profile_cosmetic_${meta.slug}_effect_v1`,kind:'effect' as const,itemId:base.id,name:base.name},
  bundle:{sku:`profile_cosmetic_${meta.slug}_bundle_v1`,kind:'bundle' as const,name:base.collection+' Collection',borderId:base.borderId,effectId:base.id},
 };
});

export const PROFILE_COSMETIC_STORE_PRODUCTS=PROFILE_COSMETIC_STORE_COLLECTIONS.flatMap(collection=>[
 {...collection.border,collectionId:collection.id,checkoutEnabled:false as const,billing:'one_time' as const},
 {...collection.effect,collectionId:collection.id,checkoutEnabled:false as const,billing:'one_time' as const},
 {...collection.bundle,collectionId:collection.id,checkoutEnabled:false as const,billing:'one_time' as const},
]);

export function profileCosmeticCollectionOwnership(state:GameState,collection:ProfileCosmeticStoreCollection){
 const borderOwned=state.account.unlockedProfileBorderIds?.includes(collection.border.itemId)??false;
 const effectOwned=state.account.unlockedProfileEffectIds?.includes(collection.effect.itemId)??false;
 return {borderOwned,effectOwned,bundleOwned:borderOwned&&effectOwned,ownedPieces:Number(borderOwned)+Number(effectOwned)};
}
