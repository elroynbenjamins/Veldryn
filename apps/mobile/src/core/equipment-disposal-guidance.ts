import {itemDef} from '../content/items';
import {disposeCraftedGearInstance} from './crafted-gear-ownership';
import {craftedGearInstances} from './crafted-gear-instances';
import {workingTowardInventoryProtectionMap} from './working-toward-inventory';
import type {GameState} from './types';

export type EquipmentDisposalMethod='sell'|'salvage';
export interface EquipmentDisposalDecision {allowed:boolean;reason?:string;}
export interface EquipmentDisposalExplanation {title:string;nextStep:string;canExtractGem:boolean;}

/** This read-only preview runs the exact-copy reducer but never commits its result.
 * The live server still validates every disposal against the latest revision. */
export function equipmentCopyDisposalDecision(
 state:GameState,instanceId:string,method:EquipmentDisposalMethod,
):EquipmentDisposalDecision{
 const record=craftedGearInstances(state).find(row=>row.id===instanceId);
 if(!record)return {allowed:false,reason:'Equipment copy could not be found. Refresh your inventory.'};
 let item:ReturnType<typeof itemDef>;
 try{item=itemDef(record.itemId);}catch{return {allowed:false,reason:'Equipment definition needs review before disposal'};}
 if(state.settings.lockedItemIds?.includes(item.id))
   return {allowed:false,reason:'This equipment type is locked'};
 if(state.settings.favoriteItemIds?.includes(item.id))
   return {allowed:false,reason:'Favorite equipment cannot be sold or salvaged'};
 if(workingTowardInventoryProtectionMap(state).has(item.id))
   return {allowed:false,reason:'Equipment needed for a Working Toward goal is protected'};
 if(item.guildOnly||item.knowledgeUnlockId)
   return {allowed:false,reason:'This equipment is not available for disposal'};
 if(method==='sell'&&(!Number.isSafeInteger(item.value)||item.value<=0))
   return {allowed:false,reason:'This equipment has no vendor value'};
 if(record.locked)return {allowed:false,reason:'This equipment copy is locked'};
 try{
   disposeCraftedGearInstance(state,instanceId,method);
   return {allowed:true};
 }catch(error){
   return {allowed:false,reason:error instanceof Error?error.message:'Equipment cannot be disposed'};
 }
}

/** Consistent, actionable explanations used by Inventory, Gear and confirmations. */
export function equipmentDisposalExplanation(reason:string):EquipmentDisposalExplanation{
 const value=reason.toLowerCase();
 if(/inventory is full|make space|storage is full/.test(value))
   return {title:'Inventory space needed',nextStep:'Free an Inventory slot before salvaging. Recovered materials must fit in Inventory.',canExtractGem:false};
 if(/saved loadout|loadout/.test(value))
   return {title:'Saved loadout',nextStep:'Remove or replace this copy in the saved loadout before disposing of it.',canExtractGem:false};
 if(/legacy equipment enhancement|legacy enhancement|last copy reserved/.test(value))
   return {title:'Older enhancement',nextStep:'An older enhancement still protects this gear. Keep the copy until its enhancement is reviewed.',canExtractGem:false};
 if(/locked|favorite/.test(value))
   return {title:'Manually protected',nextStep:'Unlock this copy or remove its Favorite marker to enable disposal.',canExtractGem:false};
 if(/working toward/.test(value))
   return {title:'Progression goal',nextStep:'This equipment is reserved for a Working Toward goal. Complete or change that goal first.',canExtractGem:false};
 if(/location|identity|unrecognized|mismatch|conflict|unknown equipment/.test(value))
   return {title:'Copy needs review',nextStep:'This copy has an unresolved ownership record. Do not discard or reassign it until the record is checked.',canExtractGem:false};
 return {title:'Cannot dispose',nextStep:reason||'Review this equipment before trying again.',canExtractGem:false};
}

