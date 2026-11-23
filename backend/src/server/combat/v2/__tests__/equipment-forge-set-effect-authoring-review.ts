import {strict as assert} from 'node:assert';
import {reviewForgeSetEffectAuthoringV2} from '../equipment-forge-set-effect-authoring-review';
import {
 auditRealForgeSetIdentityV2,reviewWornForgeSetSourcesV2,
} from '../equipment-forge-set-identity-review';
import {
 PLANNED_T1_T4_MEMBERS_V2,PLANNED_T1_T4_SETS_V2,
} from '../equipment-expanded-launch-registry';

const authoring=reviewForgeSetEffectAuthoringV2();
const source=auditRealForgeSetIdentityV2();
assert.deepEqual(reviewForgeSetEffectAuthoringV2(),authoring);
assert.equal(authoring.realFamilies,15);
assert.equal(authoring.realSourceMembers,42);
assert.equal(authoring.candidateMilestones,18);
assert.equal(authoring.familiesRequiringThirdPieceReview,6);
assert.equal(authoring.authoredAndApprovedBonuses,0);
assert.equal(authoring.status,'BLOCKED_EFFECT_NUMBERS_AND_ENGINE_NOT_APPROVED');
assert.equal(new Set(authoring.candidates.map(x=>x.forgeSetId)).size,15);
assert.equal(new Set(authoring.candidates.map(x=>x.proposedDirection)).size,15);
for(const candidate of authoring.candidates){
 const original=source.forgeSetEvidence.find(x=>x.forgeSetId===candidate.forgeSetId);
 if(!original)throw Error('authoring candidate not in real Forge source');
 assert.equal(candidate.role,original.role);
 assert.equal(candidate.tier,original.tier);
 assert.deepEqual(candidate.exactMemberIds,original.members.map(x=>x.pieceId));
 assert.deepEqual(candidate.thresholds,original.members.length>=4?[2,4]:[2]);
 assert.equal(candidate.unresolvedThreePieceMilestone,original.members.length===3);
 assert.equal(candidate.appliesToCombat,false);
 assert.equal(candidate.proposedPercentCoefficients,'UNSET_PENDING_OWNER_APPROVAL');
 assert.equal(candidate.effectImplementation,'MISSING_NOT_EXECUTABLE');
 assert.ok(!Object.keys(candidate).includes('bonusValue'),'no invented bonus strength');
 const subset=original.members.slice(0,Math.min(2,original.members.length)).map(x=>x.pieceId);
 const sourceOnly=reviewWornForgeSetSourcesV2(subset);
 assert.equal(sourceOnly.combatEffectsApplied,false);
 assert.equal(sourceOnly.activeSetCounts.length,1);
 assert.equal(sourceOnly.activeSetCounts[0].pieces,subset.length);
 assert.equal(sourceOnly.activeSetCounts[0].bonusUnlocks.length,0);
 assert.equal(sourceOnly.activeSetCounts[0].combatSetId,null);
}
const t4=authoring.candidates.filter(x=>x.tier===4);
assert.equal(t4.length,6);
for(const role of ['tank','damage','support']){
 const choice=t4.filter(c=>c.role===role);
 assert.equal(choice.length,2);
 assert.notEqual(choice[0].proposedDirection,choice[1].proposedDirection);
}
const full4=authoring.candidates.find(c=>c.exactMemberIds.length===4);
if(!full4)throw Error('missing original four-piece Forge set');
const worn=reviewWornForgeSetSourcesV2(full4.exactMemberIds);
assert.equal(worn.activeSetCounts[0].pieces,4);
assert.deepEqual(worn.activeSetCounts[0].bonusUnlocks,[]);
assert.equal(worn.combatEffectsApplied,false);
assert.equal(PLANNED_T1_T4_SETS_V2.length,48);
assert.equal(PLANNED_T1_T4_MEMBERS_V2.length,204);
const actual=new Set(authoring.candidates.flatMap(x=>x.exactMemberIds));
for(const proposed of PLANNED_T1_T4_MEMBERS_V2){
 assert.equal(actual.has(proposed.id),false,
  'unissued tiered Combat set concepts must not hijack a pinned Forge member');
 assert.equal(proposed.equippable,false);
 assert.equal(proposed.combatReady,false);
}
console.log(JSON.stringify({kind:authoring.scope,sets:authoring.realFamilies,
 pieces:authoring.realSourceMembers,milestones:authoring.candidateMilestones,
 threePieceMilestoneReview:authoring.familiesRequiringThirdPieceReview,
 distinctCounterplayDirections:15,t4AlternativesPerRole:2,
 approvedExecutableEffects:0,unissuedSetConcepts:PLANNED_T1_T4_SETS_V2.length,
 live:false}));
