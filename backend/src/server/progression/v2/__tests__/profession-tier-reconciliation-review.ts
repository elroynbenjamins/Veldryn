import {
  HIDDEN_SKILLS_TOOL_TIER_FLOORS_REVIEW_V2,
  TIER_RECONCILIATION_REVIEW_ONLY_V2,
  auditProfessionTierPoliciesV2,reviewProfessionTierCompatibilityV2,
} from '../profession-tier-reconciliation-review';
import {PROFESSION_TIER_FLOORS_V2} from '../character-progression';
function eq(actual:unknown,expected:unknown,message:string){
 if(actual!==expected)throw Error(message+': expected '+String(expected)+' got '+String(actual));
}
function invalid(level:number,tier:number){
 try{reviewProfessionTierCompatibilityV2(level,tier);}
 catch(e){if(/invalid_input/.test(String(e)))return;throw e;}
 throw Error('tier compatibility must fail closed');
}
function test(){
 eq(TIER_RECONCILIATION_REVIEW_ONLY_V2,true,'explicit review-only fence');
 const audit=auditProfessionTierPoliciesV2();
 eq(audit.allTierFloorsAligned,false,'divergence cannot be silently published');
 eq(audit.conflictingTiers.join(','),'2,3,4,5,6,7,8,9',
    'T1 matches; all T2–T9 need contract reconciliation');
 eq(audit.largestProposedLevelIncrease,9,'maximum level shift');
 eq(audit.authorizesRuntime,false,'read-only audit cannot grant');
 for(let tier=1;tier<=9;tier++){
   const old=HIDDEN_SKILLS_TOOL_TIER_FLOORS_REVIEW_V2[tier-1];
   const proposed=PROFESSION_TIER_FLOORS_V2[tier-1];
   for(const level of [0,old-1,old,proposed-1,proposed,100]){
     if(level<0)continue;
     const review=reviewProfessionTierCompatibilityV2(level,tier);
     eq(review.tier,tier,'tier preserved');
     eq(review.professionLevel,level,'level preserved');
     eq(review.oldPolicyEligible,level>=old,'old policy computed exactly');
     eq(review.proposedPolicyEligible,level>=proposed,'new policy computed exactly');
     eq(review.existingAccessAtRisk,level>=old&&level<proposed,
       'previous access gap explicitly identified');
     eq(review.requiresVerifiedEntitlementMigration,level>=old&&level<proposed,
       'migration review required where old access would be lost');
     eq(review.mayAuthorizeRecipeOrTool,false,'no item/tool grants from diagnostics');
     eq(review.safeToActivate,false,'no implicit balance approval');
   }
 }
 eq(reviewProfessionTierCompatibilityV2(10,2).existingAccessAtRisk,true,
    'existing level 10 T2 tools must not disappear silently');
 eq(reviewProfessionTierCompatibilityV2(22,3).existingAccessAtRisk,true,
    'existing level 22 T3 tool access requires review');
 eq(reviewProfessionTierCompatibilityV2(35,4).existingAccessAtRisk,true,
    'existing level 35 T4 tool access requires review');
 eq(reviewProfessionTierCompatibilityV2(90,9).existingAccessAtRisk,true,
    'T9 old hidden proposal conflicts with new level 96 proposal');
 for(const [lv,t] of [[-1,1],[101,2],[1,0],[1,10],[NaN,1],[1.1,3]])
   invalid(lv,t);
 console.log('PASS: all nine 2.0 profession tiers audited; old licenses preserved for migration review, never activated');
}
test();
