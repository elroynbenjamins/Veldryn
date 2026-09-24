export const DUNGEON_FOOD_ALLOWED=false;
/** Shared run potion budget. Higher tiers gain only a small preparation allowance; healing remains encounter-limited. */
export const DUNGEON_POTION_CHARGES_BY_TIER={1:3,2:3,3:4,4:4,5:5} as const;
export type DungeonTier=keyof typeof DUNGEON_POTION_CHARGES_BY_TIER;
export function dungeonConsumablePolicy(tier:number){
 const safe=Math.max(1,Math.min(5,Math.floor(tier))) as DungeonTier;
 return {foodAllowed:DUNGEON_FOOD_ALLOWED,potionCharges:DUNGEON_POTION_CHARGES_BY_TIER[safe]};
}
