/** Hidden regional progression review. Approved structural checkpoints;
 * numeric pressure and material source windows are candidates, not live gates.
 * No imports by gameplay routes. Region 4 and T5 activation explicitly deferred. */
export const REGIONAL_PROGRESSION_REVIEW_V2='region-tier-progression-review-20261127' as const;
export type ProgressionTier=1|2|3|4|5;
export const REGIONAL_BANDS_V2=[
 {region:'asterfall',start:1,midpoint:13,end:25,entryTier:1,upgradeTier:2,bossLevel:25,launch:true},
 {region:'sunscar',start:26,midpoint:38,end:50,entryTier:2,upgradeTier:3,bossLevel:50,launch:true},
 {region:'frostmarch',start:51,midpoint:63,end:75,entryTier:3,upgradeTier:4,bossLevel:75,launch:true},
 {region:'region4',start:76,midpoint:88,end:100,entryTier:5,upgradeTier:5,bossLevel:100,launch:false},
] as const;
export const TIER_PREPARATION_V2=[
 {tier:1,prepareFrom:1,wearCandidate:2,expectedFrom:1,launch:true},
 {tier:2,prepareFrom:8,wearCandidate:12,expectedFrom:13,launch:true},
 {tier:3,prepareFrom:32,wearCandidate:37,expectedFrom:38,launch:true},
 {tier:4,prepareFrom:57,wearCandidate:62,expectedFrom:63,launch:true},
 {tier:5,prepareFrom:70,wearCandidate:76,expectedFrom:76,launch:false},
] as const;
export function regionalProgressionAtV2(level:number){
 if(!Number.isSafeInteger(level)||level<1||level>100)throw Error('invalid_regional_review_level');
 const region=REGIONAL_BANDS_V2[Math.floor((level-1)/25)];
 const second=level>=region.midpoint;
 return {region:region.region,level,expectedTier:second?region.upgradeTier:region.entryTier,
  stage:level===region.end?'boss_checkpoint':second?'upper':'lower',
  midpoint:region.midpoint,bossLevel:region.bossLevel,
  optimizationOnly:region.region==='region4'&&second,
  regionLaunchEligible:region.launch,releaseEnabled:false as const};
}
/** Relative pressure overlay for a FIXED independent smooth baseline.
 * Distinct smaller midpoint and larger region-entry jumps; no player gear,
 * CP, party composition, or dynamic scaling input. Values not approved.
 * End boss uplift is an additional comparison, not every mob at end level. */
export function regionalPressureReviewV2(level:number,boss=false){
 const p=regionalProgressionAtV2(level);
 if(boss&&level!==p.bossLevel)throw Error('regional_boss_requires_endpoint');
 const regionTransitions=Math.floor((level-1)/25);
 const midpoints=REGIONAL_BANDS_V2.filter(r=>r.midpoint<=level).length;
 const factor=(mid:number,entry:number,bossFactor:number)=>Math.pow(mid,midpoints)*Math.pow(entry,regionTransitions)*(boss?bossFactor:1);
 return {...p,hp:factor(1.08,1.16,1.25),attack:factor(1.06,1.12,1.15),defense:factor(1.04,1.10,1.10),cpApproved:false as const};
}
