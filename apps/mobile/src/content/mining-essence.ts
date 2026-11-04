/** Rare secondary finds from Mining, analogous to Herbalism's botanical essence.
 * These are independently rolled per completed Mining action by the authoritative
 * gameplay engine (including offline settlement). The base rate is displayed
 * directly in the Mining Drops view. */
export const ASTERFALL_MINERAL_ESSENCE_ID='ASTERFALL_MINERAL_ESSENCE';
export const MINING_ESSENCE_BY_ZONE:Readonly<Record<string,{itemId:string;baseChance:number}>>={
  GREENFIELDS:{itemId:ASTERFALL_MINERAL_ESSENCE_ID,baseChance:.02},
  OLD_MINES:{itemId:ASTERFALL_MINERAL_ESSENCE_ID,baseChance:.02},
};
