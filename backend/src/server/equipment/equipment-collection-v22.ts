export type SkinBonusCategory='character_skill_xp'|'skilling_speed'|'standard_material_drop';
export const SKIN_OWNERSHIP_CATEGORY_CAP=0.10;
export const SKIN_MILESTONE_RULES_V22=[{count:3,key:'gold_normal',value:.01},{count:6,key:'gathering_yield',value:.01},{count:9,key:'craft_processing_speed',value:.01},{count:12,key:'combat_xp',value:.01},{count:18,key:'skilling_xp',value:.01},{count:24,key:'rare_material_find',value:.01},{count:27,key:'dungeon_material_quantity',value:.01}] as const;
export function cappedSkinCategoryBonusV22(numberOfEligibleSkins:number,perSkin=.01):number{return Math.min(SKIN_OWNERSHIP_CATEGORY_CAP,numberOfEligibleSkins*perSkin);}
export function unlockedSkinMilestonesV22(totalEligibleSkins:number){return SKIN_MILESTONE_RULES_V22.filter(v=>totalEligibleSkins>=v.count);}
