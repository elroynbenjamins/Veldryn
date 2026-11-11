import {EQUIPMENT_ITEMS_V33} from '../content/equipment-items-v33';
import {v33EquipmentRecipeForItem} from '../content/equipment-recipes-v33';
import {itemDef} from '../content/items';
import {itemRarity} from './item-rarity';
import type {CraftedGearInstance,InventoryState,ItemStack} from './types';

/** Server-authored salvage: never trust client-supplied inputs or percentages. */
const MATERIAL_ID='TEMPERING_DUST';
const tieredRewards=new Map<string,ItemStack>();
for(const item of EQUIPMENT_ITEMS_V33){
 const match=/^T([1-9])[A-Z]*_/.exec(item.id);
 if(!match)continue;
 tieredRewards.set(item.id,{itemId:MATERIAL_ID,quantity:Math.max(1,Math.ceil(Number(match[1])/2))});
}
/** The original guaranteed Dust is preserved, including for legacy gear. */
export function equipmentSalvageReward(itemId:string):ItemStack|null{
 const dust=tieredRewards.get(itemId);
 return dust?{...dust}:null;
}
/** Forge-specific Alchemy catalysts are always consumed and never salvaged. */
const CONSUMED_INFUSIONS=new Set([
 'VERDANT_BINDING_RESIN','IRONWOOD_BINDING_RESIN','SUNSCAR_DUNE_BINDER',
 'GLASSBOUND_BINDER','SUNFUSED_FIXATIVE','RIMEWARD_DISTILLATE','CINDERHEART_ELIXIR',
]);
function eligibleOrdinaryIngredient(itemId:string){
 if(CONSUMED_INFUSIONS.has(itemId))return false;
 const ingredient=itemDef(itemId);
 return ingredient.type==='material'&&['common','uncommon'].includes(itemRarity(ingredient));
}
/** Refund 15% base ordinary materials, plus 2.5% for Rare or 5% Epic+
 * rolls and 2.5% at Q70+ or 5% at Q90+. Max 25%, each input rounded DOWN.
 * No rare ingredients, catalysts, gems or gold. An untracked legacy item
 * cannot claim ingredients for a Forge receipt that it does not have. */
export function equipmentSalvageRewards(
 itemId:string,crafted?:Pick<CraftedGearInstance,'itemId'|'rarity'|'quality'|'acquireSource'>,
):ItemStack[]{
 const dust=equipmentSalvageReward(itemId);
 if(!dust)return [];
 if(!crafted||crafted.acquireSource!=='craft'||crafted.itemId!==itemId)return [dust];
 const recipe=v33EquipmentRecipeForItem(itemId);
 if(!recipe)return [dust];
 const rarityBps=crafted.rarity==='rare'?250:['epic','legendary','mythic'].includes(crafted.rarity)?500:0;
 const quality=crafted.quality;
 const qualityBps=typeof quality==='number'&&Number.isInteger(quality)&&quality>=0&&quality<=100
   ?quality>=90?500:quality>=70?250:0:0;
 const percentBps=Math.min(2500,1500+rarityBps+qualityBps);
 const materials=recipe.inputs.filter(input=>eligibleOrdinaryIngredient(input.itemId))
   .map(input=>({itemId:input.itemId,quantity:Math.floor(input.quantity*percentBps/10000)}))
   .filter(input=>input.quantity>0);
 return [dust,...materials];
}
/** Validate every stack and capacity as one operation; throwing loses no gear. */
export function inventoryWithSalvageRewards(
 inventory:InventoryState,rewards:readonly ItemStack[],capacity:number,
):InventoryState{
 const stacks=inventory.stacks.map(stack=>({...stack}));
 for(const reward of rewards){
  if(!Number.isSafeInteger(reward.quantity)||reward.quantity<1)throw new Error('Invalid salvage quantity');
  const current=stacks.find(stack=>stack.itemId===reward.itemId&&stack.instanceId===undefined);
  if(current){
   const sum=current.quantity+reward.quantity;
   if(!Number.isSafeInteger(sum))throw new Error('Salvage material quantity overflow');
   current.quantity=sum;
  }else{
   if(stacks.filter(stack=>stack.quantity>0).length>=capacity)throw new Error('Inventory is full; make space for salvage');
   stacks.push({itemId:reward.itemId,quantity:reward.quantity});
  }
 }
 return {...inventory,stacks};
}
