/** Common hidden handoff contract. Values originate only in verified server
 * equipment projection; a structurally valid snapshot is not authorization. */
import type {GatheringGearSkillV2} from './gathering-speed-v2-review';
export type FrozenGatheringRateReview={
 readonly accountId:string;readonly characterId:string;
 readonly activityId:string;readonly skill:GatheringGearSkillV2;
 readonly targetId:string;readonly startedAtMs:number;
 readonly gearRatingBps:number;readonly matchingSetPieces:number;
 readonly exactCopyIds:readonly string[];readonly equippedReceiptDigest:string;
 readonly rewardChannels?:{readonly skillXpAffixBps:number;readonly rareChanceAffixBps:number};
};
