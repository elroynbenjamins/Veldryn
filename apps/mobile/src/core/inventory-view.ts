import {GameState,ItemStack} from './types';
import {itemDef} from '../content/items';
import {depositToBank,withdrawFromBank,effectiveStats} from './game';
import {characterPermanentMultipliers} from './permanent-boosts';

export type InventoryFilter='all'|'new'|'favorites'|'gear'|'tool'|'food'|'material'|'potion'|'gem'|'quest';
export type InventorySort='new'|'favorite'|'name'|'quantity'|'value';
export function inventoryFavoriteIds(state:GameState){return state.settings.favoriteItemIds??[]}
export function toggleInventoryFavorite(state:GameState,itemId:string):GameState{
  const favorites=new Set(inventoryFavoriteIds(state));
  if(favorites.has(itemId))favorites.delete(itemId);else favorites.add(itemId);
  return {...state,settings:{...state.settings,favoriteItemIds:[...favorites].slice(-100)}};
}
export function inventorySeenItemIds(state:GameState){return state.settings.seenItemIds??[]}
export function inventoryNewItemIds(state:GameState){
  const seen=new Set(inventorySeenItemIds(state)),ids=[...state.inventory.stacks,...state.bank.stacks].filter(stack=>stack.quantity>0).map(stack=>stack.itemId);
  return [...new Set(ids)].filter(id=>!seen.has(id));
}
export function acknowledgeInventoryItem(state:GameState,itemId:string):GameState{
  const seen=new Set(inventorySeenItemIds(state));seen.add(itemId);
  return {...state,settings:{...state.settings,seenItemIds:[...seen].slice(-1000)}};
}
export function acknowledgeAllInventoryItems(state:GameState):GameState{
  const seen=new Set(inventorySeenItemIds(state));
  for(const stack of [...state.inventory.stacks,...state.bank.stacks])if(stack.quantity>0)seen.add(stack.itemId);
  return {...state,settings:{...state.settings,seenItemIds:[...seen].slice(-1000)}};
}
export function storageCapacityStatus(stacks:ItemStack[],capacity:number){
  const used=stacks.filter(stack=>stack.quantity>0).length,free=Math.max(0,capacity-used),ratio=capacity>0?Math.min(1,used/capacity):1;
  return {used,free,capacity,percent:Math.round(ratio*100),level:used>=capacity?'full' as const:ratio>=.9?'near' as const:'ok' as const};
}
export function visibleStacks(stacks:ItemStack[],query:string,filter:InventoryFilter,sort:InventorySort,favoriteItemIds:readonly string[]=[],newItemIds:readonly string[]=[]){
  const term=query.trim().toLowerCase(),favorites=new Set(favoriteItemIds),newItems=new Set(newItemIds);
  return stacks.filter(stack=>{const item=itemDef(stack.itemId),specialMatch=filter==='favorites'?favorites.has(item.id):filter==='new'?newItems.has(item.id):false;return stack.quantity>0&&item.name.toLowerCase().includes(term)&&(filter==='all'||filter==='favorites'||filter==='new'?filter==='all'||specialMatch:item.type===filter)}).sort((a,b)=>{
    const first=itemDef(a.itemId),second=itemDef(b.itemId);
    const newDifference=sort==='new'?Number(newItems.has(second.id))-Number(newItems.has(first.id)):0;
    const favoriteDifference=sort==='favorite'?Number(favorites.has(second.id))-Number(favorites.has(first.id)):0;
    const difference=sort==='quantity'?b.quantity-a.quantity:sort==='value'?second.value-first.value:0;
    return newDifference||favoriteDifference||difference||first.name.localeCompare(second.name);
  });
}
export function transferAmount(quantity:number,choice:1|10|'all'){return Math.min(quantity,choice==='all'?quantity:choice)}
export function transferError(state:GameState,id:string,quantity:number,from:'inventory'|'bank'){
  try{(from==='inventory'?depositToBank:withdrawFromBank)(state,id,quantity);return ''}
  catch(error){return error instanceof Error?error.message:'Cannot transfer'}
}
export function recoveryAmount(state:GameState,id:string){const base=itemDef(id).heal??0,boost=characterPermanentMultipliers(state).healingEffectivenessMultiplier;return Math.max(0,Math.min(Math.ceil(base*boost),effectiveStats(state).hp-(state.character?.currentHp??0)))}
