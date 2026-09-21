import {itemDef} from '../content/items';
import {HOLY_WATER_ID} from '../content/faith';
import {GameState} from './types';
import {hasEnhancement} from './equipment-enhancement';
import {gearInstanceById,migrateToPerInstanceGear} from './gear-instances';
import {depositGearInstance,depositToBank,salvageGearInstance,sellGearInstance,sellItem,withdrawFromBank,withdrawGearInstance} from './game';

export type BulkStorageLocation='inventory'|'bank';
function uniqueIds(ids:readonly string[]){return [...new Set(ids.filter(Boolean))].slice(0,100)}

interface SelectedRow{key:string;itemId:string;quantity:number;instanceId?:string}
function selectedRows(state:GameState,keys:readonly string[],location:BulkStorageLocation){
  const projected=migrateToPerInstanceGear(state),result:SelectedRow[]=[];
  for(const key of uniqueIds(keys)){
    const instance=gearInstanceById(projected,key);
    if(instance){
      if(instance.location!==location)continue;
      if(location==='inventory'&&projected.character&&instance.ownerCharacterId!==projected.character.id)continue;
      result.push({key,itemId:instance.itemId,quantity:1,instanceId:instance.id});continue;
    }
    const stack=projected[location].stacks.find(row=>row.itemId===key&&row.quantity>0);if(!stack)continue;
    const item=itemDef(stack.itemId);if(item.type==='gear')continue; // gear must always be selected by exact instance ID
    result.push({key,itemId:stack.itemId,quantity:stack.quantity});
  }
  return {projected,rows:result};
}
function protectedFromDisposal(state:GameState,row:SelectedRow){
  return !!state.settings.favoriteItemIds?.includes(row.itemId)||(!!row.instanceId&&hasEnhancement(state,row.itemId,row.instanceId));
}
export function bulkSelectionSummary(state:GameState,keys:readonly string[],location:BulkStorageLocation){
  const selected=selectedRows(state,keys,location),projected=selected.projected,rows=selected.rows,autoEatId=projected.character?.equippedFoodId;
  const transferable=rows.filter(row=>location==='bank'||row.itemId!==autoEatId);
  const sellable=location==='inventory'?rows.filter(row=>{const item=itemDef(row.itemId);return row.itemId!==autoEatId&&row.itemId!==HOLY_WATER_ID&&item.value>0&&!protectedFromDisposal(projected,row);}):[];
  const salvageable=location==='inventory'?rows.filter(row=>{const item=itemDef(row.itemId);return !!row.instanceId&&item.type==='gear'&&!!item.salvage&&!protectedFromDisposal(projected,row);}):[];
  return {
    selectedStackCount:rows.length,selectedUnitCount:rows.reduce((sum,row)=>sum+row.quantity,0),
    transferableIds:transferable.map(row=>row.key),transferableStackCount:transferable.length,transferableUnitCount:transferable.reduce((sum,row)=>sum+row.quantity,0),transferProtectedCount:rows.length-transferable.length,
    sellableIds:sellable.map(row=>row.key),sellableStackCount:sellable.length,sellableUnitCount:sellable.reduce((sum,row)=>sum+row.quantity,0),sellGold:sellable.reduce((sum,row)=>sum+itemDef(row.itemId).value*row.quantity,0),sellProtectedCount:rows.length-sellable.length,
    salvageableIds:salvageable.map(row=>row.key),salvageableStackCount:salvageable.length,salvageableUnitCount:salvageable.length,salvageProtectedCount:rows.length-salvageable.length,
  };
}
export function bulkTransferSelected(state:GameState,keys:readonly string[],from:BulkStorageLocation):GameState{
  const summary=bulkSelectionSummary(state,keys,from);if(!summary.transferableIds.length)throw new Error(from==='inventory'&&summary.transferProtectedCount?'Selected auto-eat food stays in Inventory.':'No selected items can be moved.');
  let next=migrateToPerInstanceGear(state);
  for(const key of summary.transferableIds){
    const instance=gearInstanceById(next,key);
    if(instance){next=from==='inventory'?depositGearInstance(next,key):withdrawGearInstance(next,key);continue;}
    const source=from==='inventory'?next.inventory:next.bank,quantity=source.stacks.find(stack=>stack.itemId===key)?.quantity??0;if(quantity<=0)continue;
    next=from==='inventory'?depositToBank(next,key,quantity):withdrawFromBank(next,key,quantity);
  }
  return next;
}
export function bulkSellSelected(state:GameState,keys:readonly string[]):GameState{
  const summary=bulkSelectionSummary(state,keys,'inventory');if(!summary.sellableIds.length)throw new Error('No selected items can be sold. Favorites, enhanced copies, auto-eat food, Holy Water and zero-value items stay protected.');
  let next=migrateToPerInstanceGear(state);
  for(const key of summary.sellableIds){
    const instance=gearInstanceById(next,key);if(instance){next=sellGearInstance(next,key);continue;}
    const quantity=next.inventory.stacks.find(stack=>stack.itemId===key)?.quantity??0;if(quantity>0)next=sellItem(next,key,quantity);
  }
  return next;
}
export function bulkSalvageSelected(state:GameState,keys:readonly string[]):GameState{
  const summary=bulkSelectionSummary(state,keys,'inventory');if(!summary.salvageableIds.length)throw new Error('No selected equipment copies can be salvaged. Favorites and enhanced copies stay protected.');
  let next=migrateToPerInstanceGear(state);for(const id of summary.salvageableIds)next=salvageGearInstance(next,id);return next;
}
