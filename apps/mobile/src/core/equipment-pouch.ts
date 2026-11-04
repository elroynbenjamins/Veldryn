import type {GameState,InventoryState,ItemStack} from './types';
import {itemDef} from '../content/items';

/** Each character has 30 dedicated slots for exact, individually identified gear.
 * Existing Inventory/Bank copies are never automatically migrated or guessed. */
export const EQUIPMENT_POUCH_BASE_CAPACITY=30;

export function normalizeEquipmentPouch(raw:unknown):InventoryState{
  const saved=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Partial<InventoryState>:{};
  const capacity=Number.isSafeInteger(saved.capacity)&&Number(saved.capacity)>=EQUIPMENT_POUCH_BASE_CAPACITY&&Number(saved.capacity)<=150?Number(saved.capacity):EQUIPMENT_POUCH_BASE_CAPACITY;
  const stacks:ItemStack[]=[];
  const seen=new Set<string>();
  for(const stack of Array.isArray(saved.stacks)?saved.stacks:[]){
    if(!stack||typeof stack.instanceId!=='string'||!stack.instanceId||seen.has(stack.instanceId)||stack.quantity!==1)continue;
    try{if(itemDef(stack.itemId).type!=='gear')continue;}catch{continue;}
    seen.add(stack.instanceId);stacks.push({itemId:stack.itemId,quantity:1,instanceId:stack.instanceId});
  }
  // Retain all valid exact copies, even if a legacy save exceeds capacity.
  return {capacity,stacks};
}
export function characterEquipmentPouch(state:GameState):InventoryState{
  return normalizeEquipmentPouch(state.equipmentPouch);
}
export function storeForgedEquipmentInPouch(state:GameState,itemId:string,instanceId:string,ownerCharacterId:string):GameState|null{
  if(state.character?.id!==ownerCharacterId)return null;
  if(itemDef(itemId).type!=='gear'||!instanceId)throw new Error('Invalid forged equipment');
  const pouch=characterEquipmentPouch(state);
  if(pouch.stacks.some(row=>row.instanceId===instanceId))throw new Error('Duplicate unique equipment copy');
  if(pouch.stacks.length>=pouch.capacity)return null;
  return {...state,equipmentPouch:{...pouch,stacks:[...pouch.stacks,{itemId,quantity:1,instanceId}]}};
}
