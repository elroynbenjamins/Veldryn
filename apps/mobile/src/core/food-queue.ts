import {ITEMS} from '../content/items';
import type {CharacterState,GameState,ItemStack} from './types';

/** One equipped food plus up to four ordered backups. This is not the activity queue. */
export const MAX_FOOD_BACKUPS=4;
const foodIds=new Set(ITEMS.filter(item=>item.type==='food'&&(item.heal??0)>0).map(item=>item.id));
export function normalizeFoodQueueIds(value:unknown,selectedId?:string):string[]{
 if(value===undefined||value===null)return [];
 if(!Array.isArray(value)||value.length>MAX_FOOD_BACKUPS)throw new Error('Invalid food queue.');
 const seen=new Set(selectedId?[selectedId]:[]);
 const ids:string[]=[];
 for(const id of value){
  if(typeof id!=='string'||!foodIds.has(id)||seen.has(id))throw new Error('Invalid food queue.');
  seen.add(id);ids.push(id);
 }
 if(ids.length&&!selectedId)throw new Error('Select an auto-eat food before adding backups.');
 return ids;
}
export function autoEatFoodOrder(character:Pick<CharacterState,'equippedFoodId'|'foodQueueIds'>|null|undefined):string[]{
 const selected=character?.equippedFoodId;
 if(!selected||!foodIds.has(selected))return [];
 return [selected,...normalizeFoodQueueIds(character?.foodQueueIds,selected)];
}
export function queuedFoodQuantity(character:Pick<CharacterState,'equippedFoodId'|'foodQueueIds'>|null|undefined,stacks:ItemStack[],consumed:ItemStack[]=[]):number{
 const ids=new Set(autoEatFoodOrder(character));
 const spent=new Map<string,number>();
 for(const row of consumed)spent.set(row.itemId,(spent.get(row.itemId)??0)+row.quantity);
 return Math.max(0,stacks.reduce((sum,row)=>sum+(ids.has(row.itemId)?row.quantity:0),0)-[...spent].reduce((sum,[id,quantity])=>sum+(ids.has(id)?quantity:0),0));
}
/** Move to the first stocked food after settlement; never claim/consume banked food. */
export function advanceAutoEatFoodSelection(character:CharacterState,stacks:ItemStack[]):Pick<CharacterState,'equippedFoodId'|'foodQueueIds'>{
 const order=autoEatFoodOrder(character);
 const available=new Set(stacks.filter(row=>row.quantity>0).map(row=>row.itemId));
 const next=order.findIndex(id=>available.has(id));
 if(next<0)return {equippedFoodId:order[order.length-1]??character.equippedFoodId,foodQueueIds:[]};
 return {equippedFoodId:order[next],foodQueueIds:order.slice(next+1).filter(id=>available.has(id))};
}
export function setAutoEatFoodQueue(state:GameState,value:unknown):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const ids=normalizeFoodQueueIds(value,state.character.equippedFoodId);
 for(const id of ids)if(!state.inventory.stacks.some(row=>row.itemId===id&&row.quantity>0))
  throw new Error('Queued food must be carried in Inventory.');
 return {...state,character:{...state.character,foodQueueIds:ids}};
}
