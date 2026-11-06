import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';
import {craftedGearInstances} from './crafted-gear-instances';
import {disposeCraftedGearInstance} from './crafted-gear-ownership';
import {canDisposeLegacyEquipment} from './equipment-enhancement';
import {equipmentPouch} from './equipment-pouch';
import type {GameState,GearSlot,ItemStack} from './types';
import {workingTowardInventoryProtectionMap} from './working-toward-inventory';

/** Snapshot-scoped identifiers: never sell an item type in place of an exact forged copy.
 * Legacy token includes the slot index and item ID so stale actions cannot target another slot. */
export function equipmentPouchSaleId(stack:ItemStack,index:number){
 return stack.instanceId?'copy:'+stack.instanceId:'legacy:'+index+':'+stack.itemId;
}

function sellLegacySlot(state:GameState,index:number,itemId:string):GameState{
 if(!state.character)throw new Error('Choose a character before selling equipment');
 const pouch=equipmentPouch(state),stack=pouch.stacks[index];
 if(!stack||stack.instanceId!==undefined||stack.itemId!==itemId||!Number.isSafeInteger(stack.quantity)||stack.quantity<1)
   throw new Error('Equipment Pouch changed; review your selection');
 const item=itemDef(itemId);
 if(item.type!=='gear'||item.guildOnly||item.knowledgeUnlockId||!Number.isSafeInteger(item.value)||item.value<=0)
   throw new Error('This equipment cannot be sold');
 if(state.settings.favoriteItemIds?.includes(itemId)||state.settings.lockedItemIds?.includes(itemId))
   throw new Error('Favorite and locked equipment stays protected');
 if(!canDisposeLegacyEquipment(state,itemId,'equipment_pouch',1))
   throw new Error('Keep the last copy reserved for legacy enhancements');
 const characters=[state.character,...(state.otherCharacters??[]).map(row=>row.character)];
 if(characters.some(character=>character.savedLoadouts?.some(loadout=>
   Object.entries(loadout.equipment).some(([slot,id])=>id===itemId&&!loadout.equipmentInstanceIds?.[slot as GearSlot]))))
   throw new Error('Saved loadouts protect this equipment');
 const gold=state.character.gold+item.value;
 if(!Number.isSafeInteger(gold))throw new Error('Character Gold overflow');
 const stacks=pouch.stacks.slice();
 if(stack.quantity===1)stacks.splice(index,1);
 else stacks[index]={...stack,quantity:stack.quantity-1};
 return {...state,character:{...state.character,gold,equipmentPouch:{...pouch,stacks}}};
}

/** Transactional, server-recomputed settlement. A single invalid or stale entry rejects
 * the entire batch. Clients only provide snapshot identities, never prices or quantities. */
export function sellEquipmentPouchSelected(state:GameState,ids:readonly string[]):GameState{
 if(!state.character)throw new Error('Choose a character before selling equipment');
 if(!Array.isArray(ids)||ids.length<1||ids.length>100||new Set(ids).size!==ids.length||
   ids.some(id=>typeof id!=='string'||!id||id.length>120))
   throw new Error('Select 1–100 equipment copies');
 const original=equipmentPouch(state).stacks;
 const byId=new Map(original.map((stack,index)=>[equipmentPouchSaleId(stack,index),{index,stack}] as const));
 const selected=ids.map(id=>{
   const row=byId.get(id);
   if(!row)throw new Error('Equipment Pouch changed; review your selection');
   return {...row,id};
 }).sort((a,b)=>b.index-a.index);
 const goalProtected=workingTowardInventoryProtectionMap(state);
 let next=state;
 for(const {index,stack,id} of selected){
   const current=equipmentPouch(next).stacks[index];
   if(!current||equipmentPouchSaleId(current,index)!==id)
     throw new Error('Equipment Pouch changed; review your selection');
   if(goalProtected.has(stack.itemId))throw new Error('Equipment needed for a Working Toward goal is protected');
   const item=itemDef(stack.itemId);
   if(item.type!=='gear'||item.value<=0||item.guildOnly||item.knowledgeUnlockId)
     throw new Error('This equipment cannot be sold');
   if(state.settings.lockedItemIds?.includes(stack.itemId)||state.settings.favoriteItemIds?.includes(stack.itemId))
     throw new Error('Favorite and locked equipment stays protected');
   next=stack.instanceId
     ?disposeCraftedGearInstance(next,stack.instanceId,'sell')
     :sellLegacySlot(next,index,stack.itemId);
 }
 return next;
}

export interface EquipmentPouchSaleCandidate{
 id:string;index:number;itemId:string;rarity:ItemRarity;gold:number;eligible:boolean;reason?:string;
}
/** Greedy, highest slot first: the preview and the actual batch have identical order.
 * A legacy enhancement's reserved last copy will never enter Select Safe. */
export function equipmentPouchSaleCandidates(state:GameState):EquipmentPouchSaleCandidate[]{
 const original=equipmentPouch(state).stacks,records=new Map(craftedGearInstances(state).map(row=>[row.id,row]));
 const result:EquipmentPouchSaleCandidate[]=[];
 let candidateState=state;
 for(let index=original.length-1;index>=0;index--){
   const stack=original[index],id=equipmentPouchSaleId(stack,index),item=itemDef(stack.itemId);
   const rarity=stack.instanceId?records.get(stack.instanceId)?.rarity??itemRarity(item):itemRarity(item);
   try{
     const next=sellEquipmentPouchSelected(candidateState,[id]);
     candidateState=next;
     result.push({id,index,itemId:stack.itemId,rarity,gold:item.value,eligible:true});
   }catch(error){
     result.push({id,index,itemId:stack.itemId,rarity,gold:item.value,eligible:false,
       reason:error instanceof Error?error.message:'Protected equipment'});
   }
 }
 return result.reverse();
}

/** Default quick sell deliberately excludes Epic, Legendary and Mythic, even if unlocked.
 * High-rarity equipment can still be explicitly selected one copy at a time. */
export function equipmentPouchQuickSellIds(candidates:readonly EquipmentPouchSaleCandidate[]){
 return candidates.filter(row=>row.eligible&&(row.rarity==='common'||row.rarity==='uncommon'||row.rarity==='rare')).map(row=>row.id);
}
