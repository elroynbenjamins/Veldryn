import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';
import {entitlementStorageCapacity} from './account-entitlements';
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

/** Salvage always grants the item's authored materials to character Inventory.
 * No item type, reward amount or material price is accepted from the client. */
function salvageLegacySlot(state:GameState,index:number,itemId:string):GameState{
 if(!state.character)throw new Error('Choose a character before salvaging equipment');
 const pouch=equipmentPouch(state),stack=pouch.stacks[index],item=itemDef(itemId);
 if(!stack||stack.instanceId!==undefined||stack.itemId!==itemId||!Number.isSafeInteger(stack.quantity)||stack.quantity<1)
   throw new Error('Equipment Pouch changed; review your selection');
 if(item.type!=='gear'||item.guildOnly||item.knowledgeUnlockId||!item.salvage)
   throw new Error('This equipment cannot be salvaged');
 if(state.settings.favoriteItemIds?.includes(itemId)||state.settings.lockedItemIds?.includes(itemId))
   throw new Error('Favorite and locked equipment stays protected');
 if(!canDisposeLegacyEquipment(state,itemId,'equipment_pouch',1))
   throw new Error('Keep the last copy reserved for legacy enhancements');
 const characters=[state.character,...(state.otherCharacters??[]).map(row=>row.character)];
 if(characters.some(character=>character.savedLoadouts?.some(loadout=>
   Object.entries(loadout.equipment).some(([slot,id])=>id===itemId&&!loadout.equipmentInstanceIds?.[slot as GearSlot]))))
   throw new Error('Saved loadouts protect this equipment');
 const reward=item.salvage;
 const existing=state.inventory.stacks.find(row=>row.itemId===reward.itemId&&row.instanceId===undefined);
 if(!existing&&state.inventory.stacks.filter(row=>row.quantity>0).length>=entitlementStorageCapacity(state,'inventory'))
   throw new Error('Inventory is full; make space for salvage');
 if(!Number.isSafeInteger((existing?.quantity??0)+reward.quantity))
   throw new Error('Salvage material quantity overflow');
 const inventoryStacks=existing
   ?state.inventory.stacks.map(row=>row===existing?{...row,quantity:row.quantity+reward.quantity}:row)
   :[...state.inventory.stacks,{...reward}];
 const pouchStacks=pouch.stacks.slice();
 if(stack.quantity===1)pouchStacks.splice(index,1);
 else pouchStacks[index]={...stack,quantity:stack.quantity-1};
 return {...state,inventory:{...state.inventory,stacks:inventoryStacks},
   character:{...state.character,equipmentPouch:{...pouch,stacks:pouchStacks}}};
}

/** Atomic, copy-specific batch salvage; any invalid, protected or stale copy
 * rejects the whole command. Rewards are computed by the shared server engine. */
export function salvageEquipmentPouchSelected(state:GameState,ids:readonly string[]):GameState{
 if(!state.character)throw new Error('Choose a character before salvaging equipment');
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
 const goals=workingTowardInventoryProtectionMap(state);
 let next=state;
 for(const {index,stack,id} of selected){
   const current=equipmentPouch(next).stacks[index];
   if(!current||equipmentPouchSaleId(current,index)!==id)
     throw new Error('Equipment Pouch changed; review your selection');
   if(goals.has(stack.itemId))throw new Error('Equipment needed for a Working Toward goal is protected');
   const item=itemDef(stack.itemId);
   if(item.type!=='gear'||item.guildOnly||item.knowledgeUnlockId||!item.salvage)
     throw new Error('This equipment cannot be salvaged');
   if(state.settings.lockedItemIds?.includes(stack.itemId)||state.settings.favoriteItemIds?.includes(stack.itemId))
     throw new Error('Favorite and locked equipment stays protected');
   next=stack.instanceId
     ?disposeCraftedGearInstance(next,stack.instanceId,'salvage')
     :salvageLegacySlot(next,index,stack.itemId);
 }
 return next;
}

export interface EquipmentPouchSalvageCandidate{
 id:string;index:number;itemId:string;eligible:boolean;reason?:string;
 reward?:{itemId:string;quantity:number};
}

/** Simulate candidates from the highest pouch slot down, matching settlement order.
 * This also checks Inventory room and legacy enhanced-copy reservations. */
export function equipmentPouchSalvageCandidates(state:GameState):EquipmentPouchSalvageCandidate[]{
 const original=equipmentPouch(state).stacks,result:EquipmentPouchSalvageCandidate[]=[];
 let candidateState=state;
 for(let index=original.length-1;index>=0;index--){
   const stack=original[index],id=equipmentPouchSaleId(stack,index),reward=itemDef(stack.itemId).salvage;
   try{
     const next=salvageEquipmentPouchSelected(candidateState,[id]);
     candidateState=next;
     result.push({id,index,itemId:stack.itemId,eligible:true,
       reward:reward?{itemId:reward.itemId,quantity:reward.quantity}:undefined});
   }catch(error){
     result.push({id,index,itemId:stack.itemId,eligible:false,
       reason:error instanceof Error?error.message:'Protected equipment'});
   }
 }
 return result.reverse();
}

/** Quick salvage has the same conservative rarity protection as quick sell. */
export function equipmentPouchQuickSalvageIds(state:GameState,candidates:readonly EquipmentPouchSalvageCandidate[]){
 const copies=new Map(craftedGearInstances(state).map(row=>[row.id,row]));
 return candidates.filter(row=>{
   const stack=equipmentPouch(state).stacks[row.index],item=itemDef(row.itemId);
   const rarity=stack?.instanceId?copies.get(stack.instanceId)?.rarity??itemRarity(item):itemRarity(item);
   return row.eligible&&(rarity==='common'||rarity==='uncommon'||rarity==='rare');
 }).map(row=>row.id).slice(0,100);
}
