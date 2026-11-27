/** Gold-only economy adjustment for NEW crafts. Recipe inputs, output, XP and
 * timers are unchanged. Keep settled jobs' existing reserved Gold snapshots. */
export const CRAFTING_GOLD_SURCHARGE_PERCENT=20;
export function increasedCraftingGoldCost(baseGold:number):number{
 if(!Number.isSafeInteger(baseGold)||baseGold<0)throw new Error('invalid_crafting_gold');
 return Math.ceil(baseGold*6/5);
}

/** Round the full equipment assembly price to the nearest 100 Gold.
 * Keep a positive craft price at or above 100; free recipes remain free.
 * Apply this to the recipe itself so UI, validation and reservation agree. */
export function roundEquipmentCraftingGoldCost(gold:number):number{
 if(!Number.isSafeInteger(gold)||gold<0)throw new Error('invalid_crafting_gold');
 return gold===0?0:Math.max(100,Math.round(gold/100)*100);
}

/** Reduce the finalized, rounded Gold price by 300 per newly crafted equipment
 * piece. Preserve the existing 100-Gold minimum for paid equipment crafts.
 * Previously queued jobs retain their original reserved Gold snapshots. */
export const EQUIPMENT_CRAFT_GOLD_REDUCTION=300;
export function reducedEquipmentCraftingGoldCost(roundedGold:number):number{
 if(!Number.isSafeInteger(roundedGold)||roundedGold<0)throw new Error('invalid_crafting_gold');
 return roundedGold===0?0:Math.max(100,roundedGold-EQUIPMENT_CRAFT_GOLD_REDUCTION);
}

/** Reduce new Cooking Gold fees by 25%, rounding down to tens.
 * Previously reserved processing jobs preserve their original fee snapshots. */
export function reducedCookingGoldCost(chargedGold:number):number{
  if(!Number.isSafeInteger(chargedGold)||chargedGold<0)throw new Error('invalid_cooking_gold');
  return chargedGold===0?0:Math.max(10,Math.floor(chargedGold*3/40)*10);
}

/** Fish Cooking only: 40% less Gold after the universal surcharge,
 * rounded to the nearest 10 Gold (minimum 10 for paid recipes).
 * Already-reserved batches retain their original Gold snapshots. */
export function reducedFishCookingGoldCost(chargedGold:number):number{
  if(!Number.isSafeInteger(chargedGold)||chargedGold<0)throw new Error('invalid_fish_cooking_gold');
  return chargedGold===0?0:Math.max(10,Math.round(chargedGold*3/50)*10);
}

/** Newly queued ingot-smelting batches trade extra raw ore and firewood for
 * roughly 15% less charged Gold, rounded to the nearest 10 (minimum 10).
 * Copper stays at 30 Gold after rounding. Existing job receipts are immutable. */
export function reducedIngotSmeltingGoldCost(chargedGold:number):number{
  if(!Number.isSafeInteger(chargedGold)||chargedGold<0)throw new Error('invalid_ingot_smelting_gold');
  return chargedGold===0?0:Math.max(10,Math.round(chargedGold*17/200)*10);
}
