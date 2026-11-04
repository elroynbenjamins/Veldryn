/** Single authoritative potion-heal catalog shared by mobile Alchemy and dungeon server.
 * Keep prices, recipe timings and crafting XP in the mobile Alchemy recipe catalog.
 */
export const HEALING_POTION_MAX_HP_FRACTIONS={
 DEWLEAF_DRAUGHT:0.20,
 RIVERHEART_DRAUGHT:0.35,
 OATHBLOOM_DRAUGHT:0.50,
} as const;
export type HealingPotionId=keyof typeof HEALING_POTION_MAX_HP_FRACTIONS;
export function healingPotionFraction(itemId:string):number|undefined{
 return Object.prototype.hasOwnProperty.call(HEALING_POTION_MAX_HP_FRACTIONS,itemId)
  ? HEALING_POTION_MAX_HP_FRACTIONS[itemId as HealingPotionId]:undefined;
}
