import {GameState,ItemStack} from './types';
import {itemDef} from '../content/items';
import {depositToBank,withdrawFromBank,effectiveStats} from './game';

export type InventoryFilter='all'|'gear'|'tool'|'food'|'material';
export type InventorySort='name'|'quantity'|'value';
export function visibleStacks(stacks:ItemStack[],query:string,filter:InventoryFilter,sort:InventorySort){
  const term=query.trim().toLowerCase();
  return stacks.filter(stack=>{const item=itemDef(stack.itemId);return stack.quantity>0&&item.name.toLowerCase().includes(term)&&(filter==='all'||item.type===filter)}).sort((a,b)=>{
    const first=itemDef(a.itemId),second=itemDef(b.itemId);
    const difference=sort==='quantity'?b.quantity-a.quantity:sort==='value'?second.value-first.value:0;
    return difference||first.name.localeCompare(second.name);
  });
}
export function transferAmount(quantity:number,choice:1|10|'all'){return Math.min(quantity,choice==='all'?quantity:choice)}
export function transferError(state:GameState,id:string,quantity:number,from:'inventory'|'bank'){
  try{(from==='inventory'?depositToBank:withdrawFromBank)(state,id,quantity);return ''}
  catch(error){return error instanceof Error?error.message:'Cannot transfer'}
}
export function recoveryAmount(state:GameState,id:string){return Math.max(0,Math.min(itemDef(id).heal??0,effectiveStats(state).hp-(state.character?.currentHp??0)))}
