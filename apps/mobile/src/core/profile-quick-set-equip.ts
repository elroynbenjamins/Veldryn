import type {GameState} from './types';
import type {WardrobeEquipped} from './profile-wardrobe';
import {PROFILE_COSMETIC_WARDROBE_COLLECTIONS,profileCosmeticCollectionOwnership} from '../content/profile-cosmetic-store';
import {PREMIUM_PROFILE_COSMETICS} from './profile-premium-cosmetics';
import {CELESTIAL_IDS} from './ascendant-cosmetics';
import {DRACONIC_IDS} from './draconic-showcase-layout';
import {ownedUltraLuxeTitles} from './ultra-luxe-titles';
import {profileAnimatedCosmeticsEnabled} from './profile-cosmetic-access';
import {ultraLuxeFullSetNamePreset} from './ultra-luxe-full-set-name';
import type {UltraLuxeGradientId} from './ultra-luxe-name-gradients';
import {wave2SetFor,wave2Complete} from './profile-cosmetic-wave2';

export type QuickSetChoice={id:string;name:string;patch:Partial<WardrobeEquipped>;namePresetId?:UltraLuxeGradientId};
export type QuickCosmeticSet={id:string;name:string;accent:string;choices:QuickSetChoice[]};
const READY_LUXE=[
 {catalogue:'celestial-sovereign',ids:CELESTIAL_IDS,title:'ascendant-celestial-title'},
 {catalogue:'draconic-dominion',ids:DRACONIC_IDS,title:'ascendant-draconic-title'},
] as const;

/** Only owned, supported, complete visual sets. Never invent grants or expose
 * unfinished collections; pick actual owned IDs, not render-only aliases. */
export function quickCosmeticSets(state:GameState):QuickCosmeticSet[]{
 if(!state.character)return [];
 const legacyEnabled=profileAnimatedCosmeticsEnabled(state);
 const sets:QuickCosmeticSet[]=[];
 const a=state.account;
 for(const row of PROFILE_COSMETIC_WARDROBE_COLLECTIONS){
  const wave2=wave2SetFor('border',row.border.itemId);
  if(wave2?!wave2Complete(a,wave2):!legacyEnabled)continue;
  if(!profileCosmeticCollectionOwnership(state,row).setOwned||!row.portraits.every(p=>p.artworkReady))continue;
  sets.push({id:row.id,name:row.name,accent:row.accent,choices:row.portraits.map(p=>({
   id:p.id,name:p.name,patch:{frame:row.border.itemId,effect:row.effect.itemId,icon:p.id},
  }))});
 }
 if(!legacyEnabled)return sets;
 for(const def of READY_LUXE){
  const row=PREMIUM_PROFILE_COSMETICS.find(p=>p.id===def.catalogue);
  if(!row||!a.unlockedProfileEffectIds?.includes(row.effectId))continue;
  const pick=(owned:readonly string[]|undefined,authored:string,legacy:string)=>owned?.includes(authored)?authored:owned?.includes(legacy)?legacy:undefined;
  const scene=pick(a.unlockedProfileBackgroundIds,def.ids.background,row.backgroundId);
  const frame=pick(a.unlockedProfileBorderIds,def.ids.border,row.borderId);
  const pet=pick(a.unlockedCosmeticPetIds,def.ids.pet,row.petId);
  if(!scene||!frame||!pet)continue;
  const title=ownedUltraLuxeTitles(state).find(t=>t.id===def.title);
  sets.push({id:row.id,name:row.name,accent:row.accent,choices:[{
   id:row.id,name:row.name,namePresetId:ultraLuxeFullSetNamePreset(row.id),patch:{scene,frame,effect:row.effectId,pet,...(title?{title:title.name}:{})},
  }]});
 }
 return sets;
}
export function quickSetEquipped(equipped:WardrobeEquipped,choice:QuickSetChoice){
 return Object.entries(choice.patch).every(([key,value])=>equipped[key as keyof WardrobeEquipped]===value);
}
/** Re-resolve using the latest authoritative state when the user presses Equip. */
export function quickSetSelection(state:GameState,current:WardrobeEquipped,setId:string,choiceId:string):WardrobeEquipped|null{
 const choice=quickCosmeticSets(state).find(row=>row.id===setId)?.choices.find(c=>c.id===choiceId);
 return choice?{...current,...choice.patch}:null;
}
/** Undo only fields still matching the applied choice; later individual edits
 * and changes to other slots remain intact. */
export function undoQuickSet(current:WardrobeEquipped,before:WardrobeEquipped,applied:WardrobeEquipped):WardrobeEquipped{
 const result={...current};
 for(const key of Object.keys(before) as (keyof WardrobeEquipped)[]){
  if(before[key]!==applied[key]&&current[key]===applied[key])result[key]=before[key];
 }
 return result;
}
