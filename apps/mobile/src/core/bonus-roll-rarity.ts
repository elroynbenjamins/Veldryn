import type {ItemRarity} from './item-rarity';

/**
 * All bonus-roll rarity adjustments are applied to the stat's base tier range
 * before drawing the persisted tenth-percent value. Equipment Quality remains
 * independent and never multiplies permanent bonus attributes a second time.
 */
export const BONUS_ROLL_RARITY_MULTIPLIER:Readonly<Record<ItemRarity,number>>={
  common:.85,
  uncommon:1,
  rare:1.20,
  epic:1.35,
  legendary:1.45,
  mythic:1.50,
};
const STEP_BPS=10;
export function rarityAdjustedBonusRange(base:readonly [number,number],rarity:ItemRarity):readonly [number,number]{
  const multiplier=BONUS_ROLL_RARITY_MULTIPLIER[rarity];
  const min=Math.max(STEP_BPS,Math.round(base[0]*multiplier/STEP_BPS)*STEP_BPS);
  const max=Math.max(min+STEP_BPS,Math.round(base[1]*multiplier/STEP_BPS)*STEP_BPS);
  return [min,max];
}
