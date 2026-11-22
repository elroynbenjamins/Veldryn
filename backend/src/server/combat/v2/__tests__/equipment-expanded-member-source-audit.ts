import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES} from '../../../equipment/equipment-crafting-v2-manifest';
import {PLANNED_T1_T4_MEMBERS_V2} from '../equipment-expanded-launch-registry';
import {
 auditRealExpandedSetSourceGapsV2,reviewExpandedSetSourceCoverageV2,
 type ReviewMemberV2,type ReviewPieceV2,
} from '../equipment-expanded-member-source-audit';

const result=auditRealExpandedSetSourceGapsV2();
const review=result.reviewed;
assert.equal(result.expectedLaunchMemberSlots,204);
assert.equal(result.potentialUnapprovedLinks,74,
 'Only 74 exact T1–T4 role/slot matches may be proposed from unassigned items');
assert.equal(result.definitivelyUnmatchedSlots,130,
 'Never claim the remaining 130 unique member identities already exist');
assert.equal(result.matchedItemsWithExistingRecipeRoutes,74);
assert.deepEqual(result.matchedItemsMissingRecipeRoutes,[]);
assert.equal(review.protectedOldSetPieces,42);
assert.equal(review.excludedClassLockedOrWeaponPieces,52);
assert.equal(review.availableUnassignedNonWeaponPieces,75);
assert.equal(review.unusedEligiblePieces.length,1);
assert.equal(review.mode,'REVIEW_ONLY_NO_ENTITLEMENT');
assert.equal(result.status,'NEEDS_ITEM_AUTHORING_SOURCE_APPROVAL_AND_COMBAT_RULES');
assert.equal(review.mayMintItems,false);
assert.equal(review.mayMutateSetIds,false);
assert.equal(review.mayEnableCrafting,false);
assert.equal(review.mayEnableCombatBonuses,false);
const sourceById=new Map(V2_SERVER_PIECES.map(x=>[x.id,x]));
const memberById=new Map(PLANNED_T1_T4_MEMBERS_V2.map(x=>[x.id,x]));
const assigned=new Set<string>();
for(const link of review.proposedLinks){
 assert.equal(link.approved,false);
 assert.equal(link.mayIssue,false);
 assert.equal(link.mayReassignExistingSet,false);
 assert.equal(link.basis,'exact_tier_role_slot_unassigned');
 const source=sourceById.get(link.existingForgeItemId)!;
 const target=memberById.get(link.plannedMemberId)!;
 assert.ok(source&&!source.setId&&!source.classRestriction);
 assert.equal(source.tier,Number(target.tier.slice(1)));
 assert.equal(source.role,target.role);
 assert.equal(source.slot,target.slot);
 assert.equal(target.setId,link.targetSetId);
 assert.ok(!assigned.has(source.id),'A candidate may only cover one set member');
 assigned.add(source.id);
}
assert.equal(assigned.size,74);
for(const gap of review.missing){
 assert.equal(gap.reason,'NO_UNASSIGNED_EXACT_SLOT_SOURCE');
 assert.equal(gap.mustAuthorOrExplicitlyReconcile,true);
 assert.ok(memberById.has(gap.plannedMemberId));
}
assert.deepEqual(Object.values(result.byTier).map(x=>x.required),[51,51,51,51]);
assert.equal(Object.values(result.byTier).reduce((n,x)=>n+x.potential,0),74);
assert.equal(Object.values(result.byTier).reduce((n,x)=>n+x.gap,0),130);
const reversed=reviewExpandedSetSourceCoverageV2(
 [...PLANNED_T1_T4_MEMBERS_V2].reverse(),[...V2_SERVER_PIECES].reverse());
assert.deepEqual(reversed,review,'Source ordering must not change proposed link IDs');

// Adversarial compact set: no protected legacy piece reuse, no wrong tier,
// no wrong role, no offslot, no accidental set privileges.
const target:ReviewMemberV2={
 id:'EQ2_LAUNCH_T1_OATHPLATE_HELMET',setId:'eq2_t1_oathplate',
 tier:'T1',role:'tank',slot:'helmet',
};
const piece=(id:string,changes:Partial<ReviewPieceV2>={}):ReviewPieceV2=>({
 id,tier:1,role:'tank',slot:'helmet',...changes,
});
const sample=reviewExpandedSetSourceCoverageV2([target],[
 piece('legacy',{setId:'EQ2_SET_OLD'}),
 piece('weapon',{slot:'weapon'}),
 piece('wrong-tier',{tier:2}),
 piece('wrong-role',{role:'damage'}),
 piece('wrong-slot',{slot:'chest'}),
 piece('class-locked',{classRestriction:'IRONWARDEN'}),
 piece('valid'),
]);
assert.deepEqual(sample.proposedLinks.map(x=>x.existingForgeItemId),['valid']);
assert.equal(sample.protectedOldSetPieces,1);
assert.equal(sample.missing.length,0);
assert.equal(sample.mayMintItems,false);
assert.equal(reviewExpandedSetSourceCoverageV2([target],[
 piece('legacy',{setId:'EQ2_SET_OLD'}),
]).missing.length,1,'Source compatibility never silently strips set ID');
assert.throws(()=>reviewExpandedSetSourceCoverageV2([target,target],[piece('a')]),
 /eq2_source_gap_duplicate_planned_member/);
assert.throws(()=>reviewExpandedSetSourceCoverageV2([target],[piece('a'),piece('a')]),
 /eq2_source_gap_duplicate_forge_piece/);
assert.throws(()=>reviewExpandedSetSourceCoverageV2([target],[piece(target.id)]),
 /eq2_source_gap_canonical_id_collision/);
assert.equal(reviewExpandedSetSourceCoverageV2([],[]).proposedLinks.length,0);
console.log('PASS: 204 EQ2 set members; 74 compatible unassigned source previews, '+
 '130 source gaps, 42 protected legacy set items, 52 excluded class-locked weapons; '+
 'all draft mapping remains nonissuable and order-independent');
