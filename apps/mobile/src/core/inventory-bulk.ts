import {itemDef} from '../content/items';
import {HOLY_WATER_ID} from '../content/faith';
import {GameState} from './types';
import {hasEnhancement} from './equipment-enhancement';
import {depositToBank,salvageItem,sellItem,withdrawFromBank} from './game';

export type BulkStorageLocation='inventory'|'bank';

function uniqueIds(itemIds:readonly string[]){return [...new Set(itemIds.filter(Boolean))].slice(0,100)}
function selectedStacks(state:GameState,itemIds:readonly string[],location:BulkStorageLocation){
  const ids=new Set(uniqueIds(itemIds)),grouped=new Map<string,number>();
  for(const stack of state[location].stacks)if(stack.quantity>0&&ids.has(stack.itemId))grouped.set(stack.itemId,(grouped.get(stack.itemId)??0)+stack.quantity);
  return [...grouped].map(([itemId,quantity])=>({itemId,quantity}));
}
function protectedFromDisposal(state:GameState,itemId:string){
  const item=itemDef(itemId);
  return !!state.settings.favoriteItemIds?.includes(itemId)||(item.type==='gear'&&hasEnhancement(state,itemId));
}

export function bulkSelectionSummary(state:GameState,itemIds:readonly string[],location:BulkStorageLocation){
  const stacks=selectedStacks(state,itemIds,location),autoEatId=state.character?.equippedFoodId;
  const transferable=stacks.filter(stack=>location==='bank'||stack.itemId!==autoEatId);
  const sellable=location==='inventory'?stacks.filter(stack=>{
    const item=itemDef(stack.itemId);
    return stack.itemId!==autoEatId&&stack.itemId!==HOLY_WATER_ID&&item.value>0&&!protectedFromDisposal(state,stack.itemId);
  }):[];
  const salvageable=location==='inventory'?stacks.filter(stack=>{
    const item=itemDef(stack.itemId);
    return item.type==='gear'&&!!item.salvage&&!protectedFromDisposal(state,stack.itemId);
  }):[];
  return {
    selectedStackCount:stacks.length,
    selectedUnitCount:stacks.reduce((sum,stack)=>sum+stack.quantity,0),
    transferableIds:transferable.map(stack=>stack.itemId),
    transferableStackCount:transferable.length,
    transferableUnitCount:transferable.reduce((sum,stack)=>sum+stack.quantity,0),
    transferProtectedCount:stacks.length-transferable.length,
    sellableIds:sellable.map(stack=>stack.itemId),
    sellableStackCount:sellable.length,
    sellableUnitCount:sellable.reduce((sum,stack)=>sum+stack.quantity,0),
    sellGold:sellable.reduce((sum,stack)=>sum+itemDef(stack.itemId).value*stack.quantity,0),
    sellProtectedCount:stacks.length-sellable.length,
    salvageableIds:salvageable.map(stack=>stack.itemId),
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
    const quantity=source.stacks.filter(stack=>stack.itemId===itemId).reduce((sum,stack)=>sum+stack.quantity,0);
    if(quantity<=0)continue;
    next=from==='inventory'?depositToBank(next,itemId,quantity):withdrawFromBank(next,itemId,quantity);
  }
  return next;
}

export function bulkSellSelected(state:GameState,itemIds:readonly string[]):GameState{
  const summary=bulkSelectionSummary(state,itemIds,'inventory');
  if(!summary.sellableIds.length)throw new Error('No selected items can be sold. Favorites, enhanced gear, auto-eat food, Holy Water and zero-value items stay protected.');
  let next=state;
  for(const itemId of summary.sellableIds){
    const quantity=next.inventory.stacks.filter(stack=>stack.itemId===itemId).reduce((sum,stack)=>sum+stack.quantity,0);
    if(quantity>0)next=sellItem(next,itemId,quantity);
  }
  return next;
}

export function bulkSalvageSelected(state:GameState,itemIds:readonly string[]):GameState{
  const summary=bulkSelectionSummary(state,itemIds,'inventory');
  if(!summary.salvageableIds.length)throw new Error('No selected equipment can be salvaged. Favorites and enhanced gear stay protected.');
  let next=state;
  for(const itemId of summary.salvageableIds){
    const quantity=next.inventory.stacks.find(stack=>stack.itemId===itemId)?.quantity??0;
    for(let count=0;count<quantity;count++)next=salvageItem(next,itemId);
  }
  return next;
}
