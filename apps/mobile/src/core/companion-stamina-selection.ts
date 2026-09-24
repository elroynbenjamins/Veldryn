import {ITEMS,itemDef} from '../content/items';
import {companionFoodStamina} from './companion-provisions';
import type {GameState} from './types';

export interface CompanionStaminaFoodSelection{itemId:string;quantity:number;}
export function companionStaminaFoodOptions(state:GameState){
 const quantities=new Map<string,number>();
 for(const stack of [...state.inventory.stacks,...state.bank.stacks])quantities.set(stack.itemId,(quantities.get(stack.itemId)??0)+stack.quantity);
 return ITEMS.filter(item=>item.type==='food'&&item.heal).map(item=>({itemId:item.id,name:item.name,heal:item.heal!,stamina:companionFoodStamina(item.id),owned:quantities.get(item.id)??0})).filter(row=>row.owned>0).sort((a,b)=>b.stamina-a.stamina||a.name.localeCompare(b.name));
}
export function companionStaminaSelectionTotal(selection:CompanionStaminaFoodSelection[]){return selection.reduce((sum,row)=>sum+companionFoodStamina(row.itemId)*Math.max(0,Math.floor(row.quantity)),0);}
export function companionAutoStaminaSelection(state:GameState,required:number){
 let remaining=Math.max(0,required);const selection:CompanionStaminaFoodSelection[]=[];
 for(const option of companionStaminaFoodOptions(state)){if(remaining<=0)break;const quantity=Math.min(option.owned,Math.ceil(remaining/option.stamina));if(quantity>0){selection.push({itemId:option.itemId,quantity});remaining-=quantity*option.stamina;}}
 return {selection,total:companionStaminaSelectionTotal(selection),ready:remaining<=0};
}
export function companionStaminaFoodLabel(itemId:string){const item=itemDef(itemId);return item.name;}
