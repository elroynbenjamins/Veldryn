import type {GameState} from '../core/types';
import {WAVE2_SETS,WAVE2_READY_SET_IDS,wave2SetFor,type Wave2Id} from '../core/profile-cosmetic-wave2';
import {PROFILE_EFFECTS} from '../core/profile-effects';
import {profileCosmeticPortraits,type ProfileCosmeticPortraitDefinition} from '../core/profile-cosmetic-icons';

type LegacyCollectionId='gloamward'|'frostbound'|'amberglass'|'briarbound';
export type ProfileCosmeticCollectionId=LegacyCollectionId|Wave2Id;
export type ProfileCosmeticStoreProductKind='set';

export interface ProfileCosmeticSetPiece{
 kind:'border'|'effect';itemId:string;name:string;
}
export interface ProfileCosmeticStoreSet{
 sku:string;kind:'set';name:string;borderId:string;effectId:string;iconIds:readonly [string,string];
}
export interface ProfileCosmeticStoreCollection{
 id:ProfileCosmeticCollectionId;name:string;tagline:string;description:string;accent:string;
 border:ProfileCosmeticSetPiece;effect:ProfileCosmeticSetPiece;portraits:readonly [ProfileCosmeticPortraitDefinition,ProfileCosmeticPortraitDefinition];set:ProfileCosmeticStoreSet;
 fallbackBorderId:string;checkoutEnabled:false;billing:'one_time';tier:'standard';
}

const META:Record<LegacyCollectionId,{name:string;tagline:string;description:string;accent:string;slug:string}> = {
 gloamward:{name:'Gloamward',tagline:'Arcane lanternlight',description:'Purple crystal light, subtle lantern pulses and drifting arcane sparks.',accent:'#B998FF',slug:'gloamward'},
 frostbound:{name:'Frostbound Chime',tagline:'Winter crystal hush',description:'Icy glints with slow rotating snowflakes descending from the upper profile edge.',accent:'#D8F3FF',slug:'frostbound'},
 amberglass:{name:'Amberglass Loop',tagline:'Emberlit gold',description:'Warm amber highlights with sparse glowing shards rising through the profile scene.',accent:'#FFD58A',slug:'amberglass'},
 briarbound:{name:'Briarbound',tagline:'Living woodland',description:'Emerald accents, drifting leaves and quiet fireflies moving across the scene.',accent:'#9DE59A',slug:'briarbound'},
};
const KEY_BY_COLLECTION:Record<string,LegacyCollectionId>={
 Gloamward:'gloamward','Frostbound Chime':'frostbound','Amberglass Loop':'amberglass',Briarbound:'briarbound',
};

export const PROFILE_COSMETIC_STORE_COLLECTIONS:readonly ProfileCosmeticStoreCollection[]=PROFILE_EFFECTS.filter(base=>!wave2SetFor('border',base.borderId)).map(base=>{
 const id=KEY_BY_COLLECTION[base.collection],meta=META[id];
 if(!id||!meta)throw new Error('profile_cosmetic_store_catalog_mismatch');
 const portraits=profileCosmeticPortraits(id);
 if(portraits.length!==2)throw new Error('profile_cosmetic_portrait_catalog_mismatch');
 const pair=portraits as unknown as readonly [ProfileCosmeticPortraitDefinition,ProfileCosmeticPortraitDefinition];
 return {
  id,name:meta.name,tagline:meta.tagline,description:meta.description,accent:meta.accent,
  fallbackBorderId:base.fallbackBorderId,checkoutEnabled:false as const,billing:'one_time' as const,tier:'standard' as const,
  border:{kind:'border' as const,itemId:base.borderId,name:base.borderName},
  effect:{kind:'effect' as const,itemId:base.id,name:base.name},
  portraits:pair,
  set:{sku:`profile_cosmetic_${meta.slug}_set_v1`,kind:'set' as const,name:base.collection+' Set',borderId:base.borderId,effectId:base.id,iconIds:[pair[0].id,pair[1].id] as const},
 };
});

/** Owner-granted Wave 2 sets are normal wardrobe entries, not store previews.
 * Store checkout remains unchanged and new SKUs are not commerce products. */
const WAVE2_META:Record<Wave2Id,{tagline:string;description:string;accent:string}>={
 tideborne:{tagline:'Coastal sea magic',description:'Pearl glints, sea-glass rails and drifting bubbles.',accent:'#94E4DD'},
 clockwork:{tagline:'Ancient machinery',description:'Brass mechanisms and mint-aether sparks.',accent:'#86C3AD'},
 stormforged:{tagline:'Stormsteel',description:'Restrained lightning sparks and steel glints.',accent:'#91BEFF'},
 'crimson-oath':{tagline:'Royal crimson',description:'Silver ornaments, ruby pulses and falling petals.',accent:'#D76381'},
};
export const PROFILE_COSMETIC_WARDROBE_COLLECTIONS:readonly ProfileCosmeticStoreCollection[]=[
 ...PROFILE_COSMETIC_STORE_COLLECTIONS,
 ...WAVE2_SETS.filter(row=>WAVE2_READY_SET_IDS.includes(row.id)).map(row=>{
  const portraits=profileCosmeticPortraits(row.id);
  if(portraits.length!==2)throw new Error('wave2_portrait_catalog_mismatch');
  const pair=portraits as unknown as readonly [ProfileCosmeticPortraitDefinition,ProfileCosmeticPortraitDefinition];
  return {id:row.id,name:row.name,...WAVE2_META[row.id],fallbackBorderId:'',checkoutEnabled:false as const,billing:'one_time' as const,tier:'standard' as const,
   border:{kind:'border' as const,itemId:row.borderId,name:row.borderName},effect:{kind:'effect' as const,itemId:row.effectId,name:row.effectName},portraits:pair,
   set:{sku:'profile_cosmetic_'+row.id.replace(/-/g,'_')+'_set_v1',kind:'set' as const,name:row.name+' Set',borderId:row.borderId,effectId:row.effectId,iconIds:[pair[0].id,pair[1].id] as const}};
 }),
];
/** These standard collections are sold only as complete four-piece sets. */
export const PROFILE_COSMETIC_STORE_PRODUCTS=PROFILE_COSMETIC_STORE_COLLECTIONS.map(collection=>({
 ...collection.set,collectionId:collection.id,checkoutEnabled:false as const,billing:'one_time' as const,tier:'standard' as const,
}));

export function profileCosmeticCollectionOwnership(state:GameState,collection:ProfileCosmeticStoreCollection){
 const borderOwned=state.account.unlockedProfileBorderIds?.includes(collection.border.itemId)??false;
 const effectOwned=state.account.unlockedProfileEffectIds?.includes(collection.effect.itemId)??false;
 const portraitsOwned=collection.portraits.map(row=>state.account.unlockedProfileIconIds?.includes(row.id)??false) as [boolean,boolean];
 const ownedPieces=Number(borderOwned)+Number(effectOwned)+Number(portraitsOwned[0])+Number(portraitsOwned[1]);
 return {borderOwned,effectOwned,portraitsOwned,setOwned:ownedPieces===4,ownedPieces};
}
