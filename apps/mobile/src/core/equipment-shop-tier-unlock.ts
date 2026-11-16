import {V33_EQUIPMENT_RECIPES} from '../content/equipment-recipes-v33';
import {mainResourceBundle,type EquipmentShopTier} from '../content/equipment-main-resource-shop';
import type {GameState} from './types';

/** Same craftability gate as the forge (without requiring inputs or Gold). */
export function equipmentShopTierUnlocked(state:GameState,tier:EquipmentShopTier):boolean{
 if(!state.character)return false;
 const levels=new Map(state.skills.map(skill=>[skill.skillId,skill.level]));
 return V33_EQUIPMENT_RECIPES.some(recipe=>recipe.v33EquipmentTier==='T'+tier
   && state.character!.level>=recipe.characterLevel
   && (levels.get(recipe.skillId)??0)>=recipe.level);
}
export function equipmentShopTierLockReason(tier:EquipmentShopTier){return 'Unlock Tier '+tier+' equipment crafting first (character level and Smithing/Tailoring).';}

/** Grants an approved x100 material bundle to the account-shared Bank, or fails without changing state. */
export function grantMainEquipmentShopResource(state:GameState,itemId:string,quantity:number):GameState{
 if(!state.character)throw new Error('A character is required to purchase crafting resources.');
 const item=mainResourceBundle(itemId);
 if(!item||quantity!==100||!equipmentShopTierUnlocked(state,item.tier))throw new Error(item?equipmentShopTierLockReason(item.tier):'Unknown equipment resource.');
 if(!Array.isArray(state.bank.stacks)||!Number.isSafeInteger(state.bank.capacity)||state.bank.capacity<1)throw new Error('Invalid shared Bank.');
 const stacks=state.bank.stacks.map(stack=>({...stack}));
 const idx=stacks.findIndex(stack=>stack.itemId===itemId&&!('instanceId' in stack)&&Number.isSafeInteger(stack.quantity)&&stack.quantity>=0&&stack.quantity+quantity<=99999);
 if(idx>=0)stacks[idx].quantity+=quantity;
 else{
  if(stacks.length>=state.bank.capacity)throw new Error('Shared Bank is full; free a slot before purchasing.');
  stacks.push({itemId,quantity});
 }
 return {...state,bank:{...state.bank,stacks}};
}
