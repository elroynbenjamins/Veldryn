import {itemDef} from '../content/items';
import {equipmentSalvageReward} from './equipment-salvage';
import {HOLY_WATER_ID} from '../content/faith';
import type {GameState,ItemStack} from './types';
import {disposeCraftedGearInstance} from './crafted-gear-ownership';
import {canDisposeLegacyEquipment} from './equipment-enhancement';
import {depositToBank,salvageItem,sellItem,withdrawFromBank} from './game';
import {workingTowardInventoryProtectionMap} from './working-toward-inventory';

export type BulkStorageLocation='inventory'|'bank';

/** Item IDs identify ordinary stacks; unique gear must always use its exact copy ID. */
export function inventoryBulkSelectionId(stack:Pick<ItemStack,'itemId'|'instanceId'>):string{
  return stack.instanceId?`copy:${stack.instanceId}`:stack.itemId;
}
function uniqueIds(itemIds:readonly string[]){return [...new Set(itemIds.filter(Boolean))].slice(0,100)}
function selectedStacks(state:GameState,itemIds:readonly string[],location:BulkStorageLocation){
  const ids=new Set(uniqueIds(itemIds));
  // Never collapse different forged copies just because they share an item type.
  return state[location].stacks.filter(stack=>stack.quantity>0&&ids.has(inventoryBulkSelectionId(stack)));
}
function protectedFromDisposal(state:GameState,itemId:string,goalProtectedIds:Set<string>,quantity:number,location:BulkStorageLocation){
  const item=itemDef(itemId);
  return goalProtectedIds.has(itemId)||!!state.settings.favoriteItemIds?.includes(itemId)||!!state.settings.lockedItemIds?.includes(itemId)
    ||(item.type==='gear'&&!canDisposeLegacyEquipment(state,itemId,location,quantity));
}

export function bulkSelectionSummary(state:GameState,itemIds:readonly string[],location:BulkStorageLocation){
  const stacks=selectedStacks(state,itemIds,location);
  // Empty selection is the default while browsing. Avoid the expensive
  // Working Toward/recipe protection walk until the player selects an item.
  if(!stacks.length)return {
    selectedStackCount:0,selectedUnitCount:0,goalProtectedCount:0,
    transferableIds:[] as string[],transferableStackCount:0,transferableUnitCount:0,transferProtectedCount:0,
    sellableIds:[] as string[],sellableStackCount:0,sellableUnitCount:0,sellGold:0,sellProtectedCount:0,
    salvageableIds:[] as string[],salvageableStackCount:0,salvageableUnitCount:0,salvageProtectedCount:0,
  };
  const autoEatId=state.character?.equippedFoodId,goalProtection=workingTowardInventoryProtectionMap(state),goalProtectedIds=new Set(goalProtection.keys());
  const goalProtected=stacks.filter(stack=>goalProtectedIds.has(stack.itemId));
  const transferable=stacks.filter(stack=>!stack.instanceId&&(location==='bank'||stack.itemId!==autoEatId));
  const sellable=location==='inventory'?stacks.filter(stack=>{
    const item=itemDef(stack.itemId);
    if(stack.itemId===autoEatId||stack.itemId===HOLY_WATER_ID||item.value<=0||item.guildOnly||item.knowledgeUnlockId||goalProtectedIds.has(stack.itemId))return false;
    if(stack.instanceId){
      if(state.settings.lockedItemIds?.includes(stack.itemId))return false;
      try{disposeCraftedGearInstance(state,stack.instanceId,'sell');return true;}catch{return false;}
    }
    return !protectedFromDisposal(state,stack.itemId,goalProtectedIds,stack.quantity,location);
  }):[];
  const salvageable=location==='inventory'?stacks.filter(stack=>{
    const item=itemDef(stack.itemId);
    if(item.type!=='gear'||!equipmentSalvageReward(stack.itemId)||goalProtectedIds.has(stack.itemId))return false;
    if(stack.instanceId){
      if(state.settings.lockedItemIds?.includes(stack.itemId))return false;
      try{disposeCraftedGearInstance(state,stack.instanceId,'salvage');return true;}catch{return false;}
    }
    return !protectedFromDisposal(state,stack.itemId,goalProtectedIds,stack.quantity,location);
  }):[];
  return {
    selectedStackCount:stacks.length,
    selectedUnitCount:stacks.reduce((sum,stack)=>sum+stack.quantity,0),
    goalProtectedCount:goalProtected.length,
    transferableIds:transferable.map(inventoryBulkSelectionId),
    transferableStackCount:transferable.length,
    transferableUnitCount:transferable.reduce((sum,stack)=>sum+stack.quantity,0),
    transferProtectedCount:stacks.length-transferable.length,
    sellableIds:sellable.map(inventoryBulkSelectionId),
    sellableStackCount:sellable.length,
    sellableUnitCount:sellable.reduce((sum,stack)=>sum+stack.quantity,0),
    sellGold:sellable.reduce((sum,stack)=>sum+itemDef(stack.itemId).value*stack.quantity,0),
    sellProtectedCount:stacks.length-sellable.length,
    salvageableIds:salvageable.map(inventoryBulkSelectionId),
    salvageableStackCount:salvageable.length,
    salvageableUnitCount:salvageable.reduce((sum,stack)=>sum+stack.quantity,0),
    salvageProtectedCount:stacks.length-salvageable.length,
  };
}

export function bulkTransferSelected(state:GameState,itemIds:readonly string[],from:BulkStorageLocation):GameState{
  const summary=bulkSelectionSummary(state,itemIds,from);
  if(!summary.transferableIds.length)throw new Error(from==='inventory'&&summary.transferProtectedCount?'Selected auto-eat food stays in Inventory.':'No selected items can be moved.');
  let next=state;
  for(const itemId of summary.transferableIds){
    const source=from==='inventory'?next.inventory:next.bank;
    const quantity=source.stacks.find(stack=>stack.itemId===itemId)?.quantity??0;
    if(quantity<=0)continue;
    next=from==='inventory'?depositToBank(next,itemId,quantity):withdrawFromBank(next,itemId,quantity);
  }
  return next;
}

export function bulkSellSelected(state:GameState,itemIds:readonly string[]):GameState{
  const summary=bulkSelectionSummary(state,itemIds,'inventory');
  if(!summary.sellableIds.length)throw new Error('No selected items can be sold. Working Toward items, favorites, locked items, enhanced gear, auto-eat food, Holy Water and zero-value items stay protected.');
  let next=state;
  for(const id of summary.sellableIds){
    if(id.startsWith('copy:')){next=disposeCraftedGearInstance(next,id.slice(5),'sell');continue;}
    const quantity=next.inventory.stacks.find(stack=>stack.itemId===id&&stack.instanceId===undefined)?.quantity??0;
    if(quantity>0)next=sellItem(next,id,quantity);
  }
  return next;
}

export function bulkSalvageSelected(state:GameState,itemIds:readonly string[]):GameState{
  const summary=bulkSelectionSummary(state,itemIds,'inventory');
  if(!summary.salvageableIds.length)throw new Error('No selected equipment can be salvaged. Working Toward items, favorites, locked items and enhanced gear stay protected.');
  let next=state;
  for(const id of summary.salvageableIds){
    if(id.startsWith('copy:')){next=disposeCraftedGearInstance(next,id.slice(5),'salvage');continue;}
    const quantity=next.inventory.stacks.find(stack=>stack.itemId===id&&stack.instanceId===undefined)?.quantity??0;
    for(let count=0;count<quantity;count++)next=salvageItem(next,id);
  }
  return next;
}
