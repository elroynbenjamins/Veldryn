/** Hidden rehearsal using real activity reward/settlement reducers.
 * No route, database write, gear mint or authorization. The future service
 * must independently read the immutable start snapshot and verify custody. */
import type {GameState} from '../../apps/mobile/src/core/types';
import {claimActivity,previewActivityReward,type GatheringRateReview} from '../../apps/mobile/src/core/game';
import {reviewGatheringSpeedV2,reviewGatheringRewardChannelsV2,type GatheringGearSkillV2} from '../../apps/mobile/src/core/gathering-speed-v2-review';
import {activityLoadoutSnapshotDigest} from './activity-loadout-reservation-review';
export const GATHERING_SETTLEMENT_REVIEW_LIVE=false as const;
export type FrozenGatheringRateReview={
 readonly accountId:string;readonly characterId:string;
 readonly activityId:string;readonly skill:GatheringGearSkillV2;
 readonly targetId:string;readonly startedAtMs:number;
 readonly gearRatingBps:number;readonly matchingSetPieces:number;
 /** Optional opt-in: old speed-only review receipts retain their prior meaning. */
 readonly rewardChannels?:{readonly skillXpAffixBps:number;readonly rareChanceAffixBps:number};
 readonly exactCopyIds:readonly string[];readonly equippedReceiptDigest:string;
};
export function reviewGatheringSettlementV2(input:{
 readonly accountId:string;readonly state:GameState;readonly nowMs:number;readonly sourceRevision:number;
 readonly frozen:FrozenGatheringRateReview;
 readonly verifyPersisted:(accountId:string,sourceRevision:number,stateDigest:string,frozenDigest:string)=>boolean;
}){
 const {state,accountId,nowMs,sourceRevision,frozen}=input;
 const a=state.activity,c=state.character;
 if(!a||!c||!accountId||!frozen||frozen.accountId!==accountId||frozen.characterId!==c.id||
 !['mining','woodcutting','fishing'].includes(frozen.skill)||a.kind!==frozen.skill||
 a.targetId!==frozen.targetId||a.startedAtMs!==frozen.startedAtMs||
 !frozen.activityId||!Number.isSafeInteger(sourceRevision)||sourceRevision<1||
 !Number.isSafeInteger(nowMs)||nowMs<a.lastClaimAtMs||
 c.classTraining||a.queueManaged||c.activityQueue?.length||
 !Number.isInteger(frozen.matchingSetPieces)||frozen.matchingSetPieces<0||frozen.matchingSetPieces>10||
 !Array.isArray(frozen.exactCopyIds)||frozen.exactCopyIds.length>10||
 frozen.exactCopyIds.some(id=>typeof id!=='string'||!id)||
 new Set(frozen.exactCopyIds).size!==frozen.exactCopyIds.length||
 frozen.matchingSetPieces>frozen.exactCopyIds.length||
 (frozen.exactCopyIds.length===0&&frozen.gearRatingBps!==0)||
 !/^[0-9a-f]{64}$/.test(frozen.equippedReceiptDigest)||
 typeof input.verifyPersisted!=='function')throw Error('gathering_review_invalid_scope');
 const stateDigest=activityLoadoutSnapshotDigest(state),frozenDigest=activityLoadoutSnapshotDigest(frozen);
 if(input.verifyPersisted(accountId,sourceRevision,stateDigest,frozenDigest)!==true||
 activityLoadoutSnapshotDigest(state)!==stateDigest||activityLoadoutSnapshotDigest(frozen)!==frozenDigest)
  throw Error('gathering_review_unverified_snapshot');
 const pace=reviewGatheringSpeedV2({baseActionSeconds:1,toolTimeMultiplier:1,existingRateMultiplier:1,
 gearRatingBps:frozen.gearRatingBps,setTimeMultiplier:frozen.matchingSetPieces>=8?.96:1});
 // The hook can never follow another activity or character. The ordinary
 // reward engine retains all tool, weather, meal, mastery and XP effects.
 const channels=frozen.rewardChannels===undefined?null:reviewGatheringRewardChannelsV2({matchingSetPieces:frozen.matchingSetPieces,skillXpAffixBps:frozen.rewardChannels.skillXpAffixBps,rareChanceAffixBps:frozen.rewardChannels.rareChanceAffixBps});
 const rateReview:GatheringRateReview=segment=>{
  if(segment.character?.id!==c.id||segment.activity?.kind!==frozen.skill||
   segment.activity.targetId!==frozen.targetId||segment.activity.startedAtMs!==frozen.startedAtMs)
   throw Error('gathering_review_activity_changed');
  return {rateMultiplier:pace.gearRateMultiplier,xpMultiplier:channels?.xpMultiplier??1,
   yieldMultiplier:channels?.yieldMultiplier??1,rareChanceMultiplier:channels?.rareChanceMultiplier??1};
 };
 const preview=previewActivityReward(structuredClone(state),nowMs,rateReview);
 const baseline=claimActivity(structuredClone(state),nowMs);
 const candidate=claimActivity(structuredClone(state),nowMs,undefined,rateReview);
 if(activityLoadoutSnapshotDigest(state)!==stateDigest)throw Error('gathering_review_source_mutated');
 return {pace,channels,preview,baselineReward:baseline.reward,candidateReward:candidate.reward,
  candidateState:candidate.state,stateDigest,frozenDigest,
  persisted:false as const,rewardGranted:false as const,releaseReady:false as const};
}
