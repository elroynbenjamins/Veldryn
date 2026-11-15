import type {ItemDef} from '../content/items';
import {V33_EQUIPMENT_RECIPES} from '../content/equipment-recipes-v33';

/** Refund only part of the Forge Gold fee: materials, upgrades and time stay sunk. */
export const EQUIPMENT_FORGE_SELL_REFUND_RATE=0.4;
const forgeGoldCostByItemId=new Map(V33_EQUIPMENT_RECIPES.map(recipe=>[recipe.output.itemId,recipe.gold]));

/** Shared vendor payout for every equipment sale (copy, pouch, bulk, Bank and auto-sell).
 * Non-equipment item prices remain unchanged; legacy gear without a Forge recipe
 * receives twice its old authored vendor value.
 */
export function itemVendorSellGold(item:Pick<ItemDef,'id'|'type'|'value'>):number{
  if(item.type!=='gear')return item.value;
  const forgeGold=forgeGoldCostByItemId.get(item.id)??0;
  return Math.max(item.value*2,Math.round(forgeGold*EQUIPMENT_FORGE_SELL_REFUND_RATE));
}
