import {EQUIPMENT_RESALE_UPLIFT_RELEASED} from './release-flags';
import type {ItemDef} from '../content/items';
import {V33_EQUIPMENT_RECIPES} from '../content/equipment-recipes-v33';

/** Refund only part of the Forge Gold fee: materials, upgrades and time stay sunk. */
export const EQUIPMENT_FORGE_SELL_REFUND_RATE=0.4;
const forgeGoldCostByItemId=new Map(V33_EQUIPMENT_RECIPES.map(recipe=>[recipe.output.itemId,recipe.gold]));

/** Shared vendor payout for every equipment sale (copy, pouch, bulk, Bank and auto-sell).
 * Non-equipment item prices remain unchanged; legacy gear without a Forge recipe
 * receives twice its old authored vendor value.
 */
export function itemVendorSellGold(item:Pick<ItemDef,'id'|'type'|'value'>,uplift=EQUIPMENT_RESALE_UPLIFT_RELEASED):number{
  if(item.type!=='gear'||!uplift)return item.value;
  const forgeGold=forgeGoldCostByItemId.get(item.id)??0;
  return forgeGold>0?Math.max(item.value,Math.round(forgeGold*EQUIPMENT_FORGE_SELL_REFUND_RATE)):item.value*2;
}
