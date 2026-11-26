import type {GatheringToolDef} from '../content/gathering-tools';
import {GATHERING_TOOL_BASE_RARITY,GATHERING_TOOL_MAX_EFFECTIVE_REDUCTION,gatheringToolBaseMultiplier,gatheringToolQualityMultiplier} from './gathering-tool-rolls';
import type {CraftedGatheringTool} from './gathering-tool-rolls';
import type {gatheringToolEffects} from './gathering-tools';

/** Presentation-only breakdown: this mirrors the actual tier contribution
 * without suggesting that individual speed affixes add percentage points.
 * A legacy untracked tool stays at Uncommon/Q50 with no rolled bonus. */
export function gatheringToolContribution(tool:Pick<GatheringToolDef,'actionTimeMultiplier'>,copy?:CraftedGatheringTool){
 const basePercent=(1-tool.actionTimeMultiplier)*100;
 const adjustedBasePercent=basePercent*gatheringToolBaseMultiplier(copy);
 const rarityMultiplier=copy?(GATHERING_TOOL_BASE_RARITY[copy.rarity]??1):1;
 const qualityMultiplier=gatheringToolQualityMultiplier(copy?.quality??50);
 return {
  basePercent,
  adjustedBasePercent,
  rarityAdjustmentPercent:(rarityMultiplier-1)*100,
  qualityAdjustmentPercent:(qualityMultiplier-1)*100,
  speedRollPercent:copy?.bonus.stat==='speed'?copy.bonus.basisPoints/100:0,
  rarityRollPercent:copy?.bonus.stat==='rarity'?copy.bonus.basisPoints/100:0,
  skillXpRollPercent:copy?.bonus.stat==='xp'?copy.bonus.basisPoints/100:0,
  legacy:!copy,
 };
}
export function gatheringToolTotalBreakdown(effects:ReturnType<typeof gatheringToolEffects>){
 // The tier sum is additive; speed rolls apply to the remaining action time.
 // Once tier contributions hit the cap, a speed roll cannot add more benefit.
 const rawTierPercent=Math.max(0,effects.baseReduction*100);
 const cappedTierPercent=Math.min(GATHERING_TOOL_MAX_EFFECTIVE_REDUCTION*100,rawTierPercent);
 const effectivePercent=Math.max(0,effects.effectiveReduction*100);
 return {
  rawTierPercent,cappedTierPercent,effectivePercent,
  speedRollGainPoints:Math.max(0,effectivePercent-cappedTierPercent),
  capped:rawTierPercent>GATHERING_TOOL_MAX_EFFECTIVE_REDUCTION*100+1e-9||effectivePercent>=GATHERING_TOOL_MAX_EFFECTIVE_REDUCTION*100-1e-9,
  rarityChanceRelativePercent:(effects.rarityChanceMultiplier-1)*100,
  skillXpRelativePercent:(effects.skillXpMultiplier-1)*100,
 };
}
export function gatheringToolPercent(value:number){
 return (Math.round(value*10)/10).toFixed(1);
}
