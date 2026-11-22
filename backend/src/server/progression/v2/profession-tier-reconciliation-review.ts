/**
 * HIDDEN / REVIEW-ONLY reconciliation of Veldryn 2.0 profession tiers.
 *
 * The independent-careers design and the older hidden Skills/tool policies
 * disagree on unlock floors. This audit is deliberately non-authorizing:
 * it cannot create recipe/item entitlements or lift a combat wearing gate.
 * Existing player licences must be verified in a real migration, not inferred
 * from a client-submitted level. Do not import into live routes/mobile/Edge.
 */
import {PROFESSION_TIER_FLOORS_V2} from './character-progression';

/** Source snapshot: hidden combat/v2/profession-progression.ts, 22 Nov 2026. */
export const HIDDEN_SKILLS_TOOL_TIER_FLOORS_REVIEW_V2=[
  1,10,22,35,45,55,65,75,90,
] as const;
export const TIER_RECONCILIATION_REVIEW_ONLY_V2=true as const;

export interface TierCompatibilityReviewV2{
 readonly tier:number;
 readonly professionLevel:number;
 readonly oldToolFloor:number;
 readonly proposedCareerFloor:number;
 readonly oldPolicyEligible:boolean;
 readonly proposedPolicyEligible:boolean;
 readonly existingAccessAtRisk:boolean;
 readonly mismatch:boolean;
 /** Never allow this diagnostic to be used as a work or equip permit. */
 readonly mayAuthorizeRecipeOrTool:false;
 readonly safeToActivate:false;
 readonly requiresVerifiedEntitlementMigration:boolean;
}
export function reviewProfessionTierCompatibilityV2(
 professionLevel:number,tier:number,
):TierCompatibilityReviewV2{
 if(!Number.isSafeInteger(professionLevel)||professionLevel<0||professionLevel>100||
    !Number.isSafeInteger(tier)||tier<1||tier>9)
   throw Error('tier_reconciliation_v2_invalid_input');
 const oldToolFloor=HIDDEN_SKILLS_TOOL_TIER_FLOORS_REVIEW_V2[tier-1];
 const proposedCareerFloor=PROFESSION_TIER_FLOORS_V2[tier-1];
 const oldPolicyEligible=professionLevel>=oldToolFloor;
 const proposedPolicyEligible=professionLevel>=proposedCareerFloor;
 const mismatch=oldToolFloor!==proposedCareerFloor;
 return {
   tier,professionLevel,oldToolFloor,proposedCareerFloor,
   oldPolicyEligible,proposedPolicyEligible,
   existingAccessAtRisk:oldPolicyEligible&&!proposedPolicyEligible,
   mismatch,mayAuthorizeRecipeOrTool:false,safeToActivate:false,
   requiresVerifiedEntitlementMigration:mismatch&&oldPolicyEligible&&!proposedPolicyEligible,
 };
}
export interface TierPolicyAuditV2{
 readonly allTierFloorsAligned:boolean;
 readonly conflictingTiers:readonly number[];
 readonly largestProposedLevelIncrease:number;
 readonly authorizesRuntime:false;
}
export function auditProfessionTierPoliciesV2():TierPolicyAuditV2{
 const conflictingTiers:number[]=[];
 let increase=0;
 for(let i=0;i<9;i++){
   const oldFloor=HIDDEN_SKILLS_TOOL_TIER_FLOORS_REVIEW_V2[i];
   const nextFloor=PROFESSION_TIER_FLOORS_V2[i];
   if(oldFloor!==nextFloor)conflictingTiers.push(i+1);
   increase=Math.max(increase,nextFloor-oldFloor);
 }
 return {
   allTierFloorsAligned:conflictingTiers.length===0,
   conflictingTiers,largestProposedLevelIncrease:increase,
   authorizesRuntime:false,
 };
}
