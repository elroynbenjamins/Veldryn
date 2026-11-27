/** Pure presentation of the same review calculations. No equip or reward writer. */
import {reviewGatheringSpeedV2,reviewGatheringRewardChannelsV2,type GatheringGearSkillV2} from './gathering-speed-v2-review';
export type GatheringBonusDisplayInput={
 skill:GatheringGearSkillV2;matchingSetPieces:number;gearRatingBps:number;
 skillXpAffixBps?:number;rareChanceAffixBps?:number;
};
export function buildGatheringBonusDisplayReview(input:GatheringBonusDisplayInput){
 if(!['mining','woodcutting','fishing'].includes(input.skill)||
  !Number.isInteger(input.matchingSetPieces)||input.matchingSetPieces<0||input.matchingSetPieces>10||
  !Number.isSafeInteger(input.gearRatingBps)||input.gearRatingBps<0||
  input.gearRatingBps>2695*input.matchingSetPieces)throw Error('gathering_display_invalid_rating');
 const pace=reviewGatheringSpeedV2({baseActionSeconds:1,toolTimeMultiplier:1,existingRateMultiplier:1,
  gearRatingBps:input.gearRatingBps,setTimeMultiplier:input.matchingSetPieces>=8?.96:1});
 const channels=reviewGatheringRewardChannelsV2(input);
 const percent=(n:number)=>Math.round(n*100)/100;
 return {skill:input.skill,pieces:input.matchingSetPieces,gearRawPercent:input.gearRatingBps/100,
  setSpeedPercent:pace.setRatingBps/100,rawSpeedPercent:percent(pace.rawRatingBps/100),
  effectiveSpeedPercent:percent(pace.effectiveRatingBps/100),
  actionTimeReductionPercent:percent(pace.relativeTimeReduction*100),
  xpPercent:percent((channels.xpMultiplier-1)*100),yieldPercent:percent((channels.yieldMultiplier-1)*100),
  rareRelativePercent:percent((channels.rareChanceMultiplier-1)*100),rareConsumerAvailable:input.skill==='mining',
  unlockedThresholds:[2,4,6,8,10].filter(n=>n<=input.matchingSetPieces),
  nextThreshold:[2,4,6,8,10].find(n=>n>input.matchingSetPieces)??null,
  releaseReady:false as const};
}
