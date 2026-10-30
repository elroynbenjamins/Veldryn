import type {GatherDef} from '../content/skills';
import {HERBALISM_ESSENCE_BY_ZONE} from '../content/herbalism';
import {CORE_PET_COLLECTIBLES} from '../content/core-pets';
import {itemDef} from '../content/items';
import {corePetActivityDropsForSource} from './core-pet-drops';
import {earlyFeatureUnlocked} from './feature-unlocks';
import {activeLiveEvent} from './live-events';
import type {GameState} from './types';

export type GatheringDropKind='yield'|'pet'|'essence'|'event_currency'|'event_discovery';
export interface GatheringDropPreviewRow{
 id:string;
 kind:GatheringDropKind;
 name:string;
 itemId?:string;
 petId?:string;
 min?:number;
 max?:number;
 /** Base probability per completed gathering action, or per event minute for event discoveries. */
 chance?:number;
 owned?:boolean;
 locked?:boolean;
}

/** Read-only disclosure. Uses gameplay's drop tables; it never generates an independent drop rate. */
export function gatheringDropPreview(activity:GatherDef,state:GameState,nowMs=Date.now()):GatheringDropPreviewRow[]{
 const rows:GatheringDropPreviewRow[]=[{
  id:`yield:${activity.itemId}`,kind:'yield',name:itemDef(activity.itemId).name,
  itemId:activity.itemId,min:activity.min,max:activity.max,
 }];
 const petsUnlocked=earlyFeatureUnlocked(state,'pets');
 const owned=new Set([...(state.account.unlockedCosmeticPetIds??[]),...(state.character?.ownedPetIds??[])]);
 for(const rule of corePetActivityDropsForSource('gathering',activity.id)){
  const pet=CORE_PET_COLLECTIBLES.find(entry=>entry.id===rule.petId);
  if(!pet)continue;
  rows.push({
   id:`pet:${rule.petId}`,kind:'pet',name:pet.name,petId:pet.id,chance:rule.chance,
   owned:owned.has(pet.id),locked:!petsUnlocked,
  });
 }
 if(activity.skillId==='herbalism'){
  const essence=HERBALISM_ESSENCE_BY_ZONE[activity.zoneId];
  if(essence)rows.push({
   id:`essence:${essence.itemId}`,kind:'essence',name:itemDef(essence.itemId).name,
   itemId:essence.itemId,chance:essence.baseChance,
  });
 }
 // Event currency and discoveries are earned from eligible gathering minutes, not individual resource rolls.
 const event=activeLiveEvent(state,nowMs);
 if(event){
  rows.push({id:`event:${event.definition.id}`,kind:'event_currency',name:event.definition.currencyName});
  for(const discovery of event.definition.discoveries.filter(entry=>entry.source==='gathering')){
   rows.push({id:`event-discovery:${discovery.id}`,kind:'event_discovery',name:discovery.name,chance:discovery.chance});
  }
 }
 return rows;
}

export function gatheringDropPercent(chance:number):string{
 return `${(Math.max(0,Math.min(1,chance))*100).toFixed(2).replace(/\\.?0+$/,'')}%`;
}
