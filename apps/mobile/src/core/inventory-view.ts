import {GameState,ItemStack} from './types';
import {itemDef} from '../content/items';
import {depositToBank,withdrawFromBank,effectiveStats} from './game';
import {characterPermanentMultipliers} from './permanent-boosts';

export type InventoryFilter='all'|'favorites'|'gear'|'tool'|'food'|'material'|'potion'|'gem'|'quest';
export type InventorySort='favorite'|'name'|'quantity'|'value';
export function visibleStacks(stacks:ItemStack[],query:string,filter:InventoryFilter,sort:InventorySort,favoriteItemIds:readonly string[]=[]){
  const term=query.trim().toLowerCase(),favorites=new Set(favoriteItemIds);
  return stacks.filter(stack=>{const item=itemDef(stack.itemId);return stack.quantity>0&&item.name.toLowerCase().includes(term)&&(filter==='all'||filter==='favorites'?filter!=='favorites'||favorites.has(item.id):item.type===filter)}).sort((a,b)=>{
    const first=itemDef(a.itemId),second=itemDef(b.itemId);
    const favoriteDifference=sort==='favorite'?Number(favorites.has(second.id))-Number(favorites.has(first.id)):0;
    const difference=sort==='quantity'?b.quantity-a.quantity:sort==='value'?second.value-first.value:0;
    return favoriteDifference||difference||first.name.localeCompare(second.name);
  });
}
export function transferAmount(quantity:number,choice:1|10|'all'){return Math.min(quantity,choice==='all'?quantity:choice)}
export function transferError(state:GameState,id:string,quantity:number,from:'inventory'|'bank'){
  try{(from==='inventory'?depositToBank:withdrawFromBank)(state,id,quantity);return ''}
  catch(error){return error instanceof Error?error.message:'Cannot transfer'}
}
export function recoveryAmount(state:GameState,id:string){const base=itemDef(id).heal??0,boost=characterPermanentMultipliers(state).healingEffectivenessMultiplier;return Math.max(0,Math.min(Math.ceil(base*boost),effectiveStats(state).hp-(state.character?.currentHp??0)))}
