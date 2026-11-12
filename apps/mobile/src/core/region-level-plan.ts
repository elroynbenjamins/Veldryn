/**
 * Regional chapter progression proposal (staged release, no database migration).
 *
 * Character-level ranges and the pressure from local gear tiers must use the
 * same schedule. T6+ remains gated by equipment-release; the next chapter
 * may be visible long before its gear is released.
 */
import {MAX_RELEASED_EQUIPMENT_TIER} from '../content/equipment-release';

export const REGIONAL_CHAPTER_LEVELS={
 ASTERFALL:{first:1,last:25,firstTier:1,secondTier:2,secondTierEntry:13,secondTierExpected:17},
 SUNSCAR:{first:26,last:50,firstTier:3,secondTier:4,secondTierEntry:38,secondTierExpected:42},
 FROSTMARCH:{first:51,last:75,firstTier:5,secondTier:6,secondTierEntry:63,secondTierExpected:67},
} as const;

export type ChapterRegion=keyof typeof REGIONAL_CHAPTER_LEVELS;
export function expectedRegionalEquipmentTier(zone:string,enemyLevel:number):number|undefined {
 if(zone==='Sunscar')return enemyLevel>=REGIONAL_CHAPTER_LEVELS.SUNSCAR.secondTierExpected?4:3;
 if(zone==='Frostmarch'){
  const desired=enemyLevel>=REGIONAL_CHAPTER_LEVELS.FROSTMARCH.secondTierExpected?6:5;
  // Never penalize an otherwise prepared player for a tier that is unreleased.
  return Math.min(desired,MAX_RELEASED_EQUIPMENT_TIER);
 }
 return undefined;
}

/**
 * Test-calibrated target: ~25 hours of continuous character-combat XP per
 * Frostmarch level, before boosts/quests/dungeons. A smooth 1.4x..2.3x
 * multiplier across Lv51..75 reflects current Nov 12 run projections.
 *
 * This multiplies *character XP only*, not class skill XP, profession XP,
 * item drops, gold or dungeon rewards. Values are reverified in CI.
 */
export function frostMarchCharacterXpMultiplier(zone:string,characterLevel:number):number {
 if(zone!=='Frostmarch')return 1;
 const l=Math.min(75,Math.max(51,Math.floor(characterLevel)));
 if(l<=62)return 1.4+(l-51)*(0.60/11);
 return 2.0+(l-62)*(0.30/13);
}
