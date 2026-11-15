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
