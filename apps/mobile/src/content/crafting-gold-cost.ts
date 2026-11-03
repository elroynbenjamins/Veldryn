/** Gold-only economy adjustment for NEW crafts. Recipe inputs, output, XP and
 * timers are unchanged. Keep settled jobs' existing reserved Gold snapshots. */
export const CRAFTING_GOLD_SURCHARGE_PERCENT=20;
export function increasedCraftingGoldCost(baseGold:number):number{
 if(!Number.isSafeInteger(baseGold)||baseGold<0)throw new Error('invalid_crafting_gold');
 return Math.ceil(baseGold*6/5);
}
