import type {GameState} from './types';
import type {WardrobeCategory,WardrobeRow,WardrobeEquipped} from './profile-wardrobe';
import type {QuickCosmeticSet} from './profile-quick-set-equip';
import {ABYSSAL_COLLECTION,ABYSSAL_IDS} from './abyssal-showcase-layout';
import {PARADOX_COLLECTION,PARADOX_IDS} from './paradox-showcase-layout';
import {eligibleReviewCollections,type ReviewGrantSnapshot,type ReviewScope} from './ultra-luxe-review-integration';

export const NEW_ULTRA_LUXE_WARDROBE=[
 {id:ABYSSAL_COLLECTION.id,name:ABYSSAL_COLLECTION.name,accent:ABYSSAL_COLLECTION.accent,ids:ABYSSAL_IDS,backgroundName:ABYSSAL_COLLECTION.backgroundName,borderName:ABYSSAL_COLLECTION.borderName,petName:ABYSSAL_COLLECTION.petName,titleId:'ascendant-abyssal-title',titleName:ABYSSAL_COLLECTION.badgeName},
 {id:PARADOX_COLLECTION.id,name:PARADOX_COLLECTION.name,accent:PARADOX_COLLECTION.accent,ids:PARADOX_IDS,backgroundName:PARADOX_COLLECTION.backgroundName,borderName:PARADOX_COLLECTION.borderName,petName:PARADOX_COLLECTION.petName,titleId:'ascendant-paradox-title',titleName:PARADOX_COLLECTION.badgeName},
] as const;
/** Discovery hint only. A verified, self-only RPC is independently required. */
export function newUltraLuxeHint(state:GameState){
 const a=state.account;
 return NEW_ULTRA_LUXE_WARDROBE.some(c=>a.unlockedProfileBackgroundIds?.includes(c.ids.background)||a.unlockedProfileBorderIds?.includes(c.ids.border)||a.unlockedCosmeticPetIds?.includes(c.ids.pet)||a.unlockedTitleIds?.includes(c.titleId));
}
export function ownedNewUltraLuxeCollections(state:GameState,scope:ReviewScope,projection:ReviewGrantSnapshot|undefined){
 if(state.character?.id!==scope.characterId)return [];
 const allowed=eligibleReviewCollections(true,scope,projection).map(c=>c.id),a=state.account;
 return NEW_ULTRA_LUXE_WARDROBE.filter(c=>allowed.includes(c.id)&&a.unlockedProfileBackgroundIds?.includes(c.ids.background)&&a.unlockedProfileBorderIds?.includes(c.ids.border)&&a.unlockedCosmeticPetIds?.includes(c.ids.pet)&&a.unlockedTitleIds?.includes(c.titleId));
}
/** Existing live categories remain unchanged unless the new set is verified and complete.
 * No locked tiles or total-count inflation for non-owners. */
export function appendOwnedUltraLuxeWardrobe(categories:WardrobeCategory[],state:GameState,scope:ReviewScope,projection:ReviewGrantSnapshot|undefined):WardrobeCategory[]{
 const c=state.character,owned=ownedNewUltraLuxeCollections(state,scope,projection);
 if(!c||!owned.length)return categories;
 const additions:WardrobeRow[]=owned.flatMap<WardrobeRow>(row=>[
  {kind:'scene',id:row.ids.background,name:row.backgroundName,group:'Ascendant',unlocked:true,equipped:c.profileBackgroundId===row.ids.background},
  {kind:'frame',id:row.ids.border,name:row.borderName,group:'Ascendant',unlocked:true,equipped:c.profileBorderId===row.ids.border},
  {kind:'pet',id:row.ids.pet,name:row.petName,group:'Ascendant',unlocked:true,equipped:c.selectedCosmeticPetId===row.ids.pet},
  {kind:'title',id:row.titleId,name:row.titleName,group:'Ascendant',unlocked:true,equipped:c.profileTitle===row.titleName},
 ]);
 return categories.map(category=>{
  const rows=additions.filter(row=>row.kind===category.kind&&!category.rows.some(old=>old.id===row.id));
  return rows.length?{...category,rows:[...category.rows,...rows],owned:category.owned+rows.length,total:category.total+rows.length}:category;
 });
}
export function ownedNewUltraLuxeQuickSets(state:GameState,scope:ReviewScope,projection:ReviewGrantSnapshot|undefined):QuickCosmeticSet[]{
 return ownedNewUltraLuxeCollections(state,scope,projection).map(c=>({id:c.id,name:c.name,accent:c.accent,choices:[{id:c.id,name:c.name,patch:{scene:c.ids.background,frame:c.ids.border,pet:c.ids.pet,title:c.titleName,effect:''}}]}));
}
export function newUltraLuxeQuickSelection(state:GameState,scope:ReviewScope,projection:ReviewGrantSnapshot|undefined,current:WardrobeEquipped,setId:string,choiceId:string){
 const choice=ownedNewUltraLuxeQuickSets(state,scope,projection).find(c=>c.id===setId)?.choices.find(c=>c.id===choiceId);
 return choice?{...current,...choice.patch}:null;
}
export function isNewUltraLuxeWardrobePiece(row:Pick<WardrobeRow,'kind'|'id'>){
 return NEW_ULTRA_LUXE_WARDROBE.some(c=>row.kind==='scene'&&row.id===c.ids.background||row.kind==='frame'&&row.id===c.ids.border||row.kind==='pet'&&row.id===c.ids.pet||row.kind==='title'&&row.id===c.titleId);
}
/** Recheck candidate pieces at the queued write boundary. Server commit remains authority. */
export function newUltraLuxePatchAllowed(state:GameState,scope:ReviewScope,projection:ReviewGrantSnapshot|undefined,patch:Partial<WardrobeEquipped>){
 const owned=ownedNewUltraLuxeCollections(state,scope,projection);
 return NEW_ULTRA_LUXE_WARDROBE.every(c=>!(
  patch.scene===c.ids.background||patch.frame===c.ids.border||patch.pet===c.ids.pet||patch.title?.trim().toLowerCase()===c.titleName.toLowerCase()
 )||owned.some(row=>row.id===c.id));
}

/** Appearance authorization is separate from ownership discovery. Public callers
 * pass only the server's sanitized appearance marker, never private grant lists. */
export type NewLuxeAppearance={background?:string|null;border?:string|null;pet?:string|null;effect?:string|null;verifiedTitleId?:string|null;displayedBadges:readonly string[]};
export function candidateAppearanceIds(selection:NewLuxeAppearance,allowed:readonly string[]){
 const rows=NEW_ULTRA_LUXE_WARDROBE;
 const resolve=(kind:'background'|'border'|'pet',id:string|null|undefined)=>{
  const row=rows.find(c=>c.ids[kind]===id);
  return row&&!allowed.includes(row.id)?kind==='background'?'asterfall-night':undefined:id;
 };
 return {...selection,background:resolve('background',selection.background),border:resolve('border',selection.border),pet:resolve('pet',selection.pet)};
}
export function candidateAppearanceHint(selection:Pick<NewLuxeAppearance,'background'|'border'|'pet'>){
 return NEW_ULTRA_LUXE_WARDROBE.some(c=>c.ids.background===selection.background||c.ids.border===selection.border||c.ids.pet===selection.pet);
}
export function candidateShowcase(selection:NewLuxeAppearance,allowed:readonly string[]){
 const row=NEW_ULTRA_LUXE_WARDROBE.find(c=>allowed.includes(c.id)&&c.ids.background===selection.background&&c.ids.border===selection.border);
 if(!row)return undefined;
 const effect=ULTRA_LUXE_EFFECTS[row.id];
 if(selection.effect&&selection.effect!==effect)return undefined;
 return {id:row.id,fullSet:selection.pet===row.ids.pet&&selection.verifiedTitleId===row.titleId&&selection.displayedBadges.includes(row.ids.badge)};
}
const ULTRA_LUXE_EFFECTS={
 'ascendant-abyssal-majesty':'premium:abyssal-majesty:call-of-the-deep',
 'ascendant-paradox-eternal':'premium:paradox-eternal:reality-rewritten',
} as const;
export function candidateVerifiedTitle(title:string|undefined|null,id:unknown,allowed:readonly string[]){
 return NEW_ULTRA_LUXE_WARDROBE.find(c=>allowed.includes(c.id)&&c.titleId===id&&c.titleName===title);
}
