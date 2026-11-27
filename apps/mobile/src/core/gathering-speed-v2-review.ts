/** Hidden Equipment 2.0 gathering pace candidate. No production imports.
 * Rating is action RATE, not subtractive action-time reduction.
 * Existing tool pace and other established sources are applied once, unchanged.
 * Proposed thresholds are review-only until economy approval. */
export const GATHERING_SPEED_V2_LIVE=false as const;
export type GatheringGearSkillV2='mining'|'woodcutting'|'fishing';
export const GATHERING_SPEED_CURVE_V2=Object.freeze({
 fullThroughBps:10000,threeQuarterThroughBps:20000,secondSlope:.75,thirdSlope:.5,
 maxReviewRatingBps:100000,
});
export function gatheringSpeedEffectiveRatingV2(rawBps:number){
 if(!Number.isSafeInteger(rawBps)||rawBps<0||rawBps>GATHERING_SPEED_CURVE_V2.maxReviewRatingBps)
  throw Error('gathering_speed_invalid_rating');
 return Math.min(rawBps,10000)+Math.min(Math.max(0,rawBps-10000),10000)*.75+Math.max(0,rawBps-20000)*.5;
}
export function reviewGatheringSpeedV2(input:{
 /** Base seconds including node difficulty/weather, excluding tool and rate channels below. */
 baseActionSeconds:number;
 /** Real existing gatheringToolEffects(...).timeMultiplier. */
 toolTimeMultiplier:number;
 /** Existing multiplicative speed effects excluding new gear. */
 existingRateMultiplier:number;
 /** Same-skill innate plus same-skill speed affix basis points. */
 gearRatingBps:number;
 /** Existing 8-piece preview is .96; convert its rate increment into rating. */
 setTimeMultiplier:1|.96;
}){
 const {baseActionSeconds,toolTimeMultiplier,existingRateMultiplier,gearRatingBps,setTimeMultiplier}=input;
 if(!Number.isFinite(baseActionSeconds)||baseActionSeconds<=0||
 !Number.isFinite(toolTimeMultiplier)||toolTimeMultiplier<.2-1e-9||toolTimeMultiplier>1.15+1e-9||
 !Number.isFinite(existingRateMultiplier)||existingRateMultiplier<=0||
 !Number.isSafeInteger(gearRatingBps)||gearRatingBps<0||
 (setTimeMultiplier!==1&&setTimeMultiplier!==.96))throw Error('gathering_speed_invalid_pace');
 const setRatingBps=Math.round((1/setTimeMultiplier-1)*10000);
 const rawRatingBps=gearRatingBps+setRatingBps;
 const effectiveRatingBps=gatheringSpeedEffectiveRatingV2(rawRatingBps);
 const gearRateMultiplier=1+effectiveRatingBps/10000;
 const existingSeconds=baseActionSeconds*toolTimeMultiplier/existingRateMultiplier;
 const actionSeconds=existingSeconds/gearRateMultiplier;
 if(!Number.isFinite(actionSeconds)||actionSeconds<=0)throw Error('gathering_speed_invalid_result');
 return {rawRatingBps,effectiveRatingBps,setRatingBps,gearRateMultiplier,existingSeconds,actionSeconds,
  relativeTimeReduction:1-1/gearRateMultiplier,live:false as const,releaseReady:false as const};
}

/** Bounds follow ten V96 mythic affixes at maximum strength plus V64 set
 * bonuses. They are review guardrails, not a new general stat cap. */
export function reviewGatheringRewardChannelsV2(input:{
 matchingSetPieces:number;skillXpAffixBps?:number;rareChanceAffixBps?:number;
}){
 const {matchingSetPieces,skillXpAffixBps=0,rareChanceAffixBps=0}=input;
 if(!Number.isInteger(matchingSetPieces)||matchingSetPieces<0||matchingSetPieces>10||
 !Number.isSafeInteger(skillXpAffixBps)||skillXpAffixBps<0||skillXpAffixBps>330*matchingSetPieces||
 !Number.isSafeInteger(rareChanceAffixBps)||rareChanceAffixBps<0||rareChanceAffixBps>825*matchingSetPieces)
  throw Error('gathering_review_invalid_reward_channels');
 // Approved replacement: previous +4%/+3% yield becomes equal Skill XP.
 const setXpBps=(matchingSetPieces>=2?300:0)+(matchingSetPieces>=4?400:0)+(matchingSetPieces>=10?800:0);
 const setRareBps=matchingSetPieces>=6?1000:0;
 return {skillXpAffixBps,rareChanceAffixBps,setXpBps,setRareBps,
  xpMultiplier:1+(skillXpAffixBps+setXpBps)/10000,
  rareChanceMultiplier:1+(rareChanceAffixBps+setRareBps)/10000,
  releaseReady:false as const};
}
