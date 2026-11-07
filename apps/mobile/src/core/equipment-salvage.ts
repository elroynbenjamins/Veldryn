import {EQUIPMENT_ITEMS_V33} from '../content/equipment-items-v33';
import type {ItemStack} from './types';

/** Equipment 2.0 salvage uses an explicit catalog-based rule.
 * No legacy ItemDef.salvage property, client reward amount or crafted rarity is trusted. */
const MATERIAL_ID='TEMPERING_DUST';
const tieredRewards=new Map<string,ItemStack>();
for(const item of EQUIPMENT_ITEMS_V33){
 const match=/^T([1-9])_/.exec(item.id);
 if(!match)throw new Error('Missing v33 equipment tier for salvage: '+item.id);
 tieredRewards.set(item.id,{itemId:MATERIAL_ID,quantity:Math.max(1,Math.ceil(Number(match[1])/2))});
}
export function equipmentSalvageReward(itemId:string):ItemStack|null{
 const recipe=tieredRewards.get(itemId);
 return recipe?{...recipe}:null;
}
