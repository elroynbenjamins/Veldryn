import {COMPANION_BOND_CONFIG,COMPANION_BOND_ESSENCE_REWARDS} from '../content/combat-companions';

/** Cumulative Bond XP is projected into the current level, not displayed as raw XP. */
export function companionBondProgress(level:number,bondXp:number){
 const thresholds=COMPANION_BOND_CONFIG.xpThresholds;
 const safeLevel=Math.max(1,Math.min(COMPANION_BOND_CONFIG.maxLevel,Math.floor(level)));
 const start=thresholds[safeLevel-1],maxed=safeLevel===COMPANION_BOND_CONFIG.maxLevel;
 const end=maxed?start:thresholds[safeLevel];
 const required=end-start;
 const current=maxed?required:Math.min(required,Math.max(0,Math.floor(bondXp)-start));
 const remaining=Math.max(0,required-current);
 const percent=maxed?100:required?Math.min(100,Math.round(current/required*100)):0;
 const nextMilestone=([2,4,6,8,10] as const).find(target=>target>safeLevel);
 const nextReward=nextMilestone===10?'Unique Bond Trait':nextMilestone?String(COMPANION_BOND_ESSENCE_REWARDS[nextMilestone])+' Essence':undefined;
 return {level:safeLevel,maxed,current,required,remaining,percent,nextLevel:maxed?undefined:safeLevel+1,nextMilestone,nextReward,totalXp:Math.min(thresholds[9],Math.max(start,Math.floor(bondXp)))};
}
