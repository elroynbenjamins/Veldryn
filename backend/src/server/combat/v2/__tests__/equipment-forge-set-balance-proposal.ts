/** HIDDEN: source-backed original Forge set 2/3-piece preview, NO executable bonus. */
import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES} from '../../../equipment/equipment-crafting-v2-manifest';
import {reviewOriginalForgeSetBalanceDraftV2,
 reviewOriginalForgeWornSetDraftV2}
 from '../equipment-forge-set-balance-proposal';
import {reviewForgeSetEffectAuthoringV2}
 from '../equipment-forge-set-effect-authoring-review';

const compiled=reviewOriginalForgeSetBalanceDraftV2();
const source=reviewForgeSetEffectAuthoringV2();
assert.deepEqual(compiled,reviewOriginalForgeSetBalanceDraftV2());
assert.equal(compiled.originalFamilies,15);
assert.equal(compiled.originalMembers,42);
assert.equal(compiled.canUseInCombat,false);
assert.equal(compiled.canGrantBonuses,false);
assert.equal(compiled.releaseApproved,false);
assert.equal(compiled.requiresOwnerBalanceApproval,true);
assert.equal(compiled.families.length,15);
assert.equal(source.authoredAndApprovedBonuses,0);
assert.equal(new Set(compiled.families.map(s=>s.setId)).size,15);
assert.equal(new Set(compiled.families.flatMap(s=>s.exactMemberIds)).size,42);
let two=0,three=0,four=0,negative=0;
for(const set of compiled.families){
 const exact=V2_SERVER_PIECES.filter(p=>p.setId===set.setId);
 assert.deepEqual([...exact.map(p=>p.id)].sort(),
  [...set.exactMemberIds].sort());
 assert.equal(set.executable,false);
 assert.equal(set.affectsBaseStats,false);
 assert.deepEqual(set.milestones.map(m=>m.requiredPieces),
  exact.length>=4?[2,3,4]:exact.length===3?[2,3]:[2]);
 assert.ok(set.milestones.every(m=>m.status==='PROPOSAL_NOT_COMBAT_APPLIED'));
 assert.ok(set.milestones.every(m=>m.proposedPercent>0&&m.proposedPercent<=5));
 const firstTwo=exact.slice(0,2);
 const preview=reviewOriginalForgeWornSetDraftV2(firstTwo.map(x=>x.id));
 assert.equal(preview.appliedBonusCount,0);
 assert.equal(preview.approved,false);
 assert.deepEqual(preview.reached.map(s=>s.setId),[set.setId]);
 assert.deepEqual(preview.reached[0].proposedMilestones.map(m=>m.requiredPieces),[2]);
 two++;
 if(exact.length>=3){
  const triple=reviewOriginalForgeWornSetDraftV2(exact.slice(0,3).map(x=>x.id));
  assert.equal(triple.appliedBonusCount,0);
  assert.deepEqual(triple.reached[0].proposedMilestones.map(m=>m.requiredPieces),[2,3]);
  assert.ok(triple.reached[0].proposedMilestones[1].proposedPercent>
   triple.reached[0].proposedMilestones[0].proposedPercent);
  three++;
 }
 if(exact.length>=4){four++;}
 assert.throws(()=>reviewOriginalForgeWornSetDraftV2([firstTwo[0].id,
  firstTwo[0].id]),/invalid_worn_snapshot/);negative++;
}
assert.throws(()=>reviewOriginalForgeWornSetDraftV2(['LEGACY_PRE_2_0_FAKE']),
 /unknown_or_conflicting_worn_piece/);negative++;
assert.throws(()=>reviewOriginalForgeWornSetDraftV2(
  V2_SERVER_PIECES.slice(0,11).map(x=>x.id)),
 /invalid_worn_snapshot|unknown_or_conflicting_worn_piece/);negative++;
assert.equal(two,15);
assert.equal(three+2*0,compiled.families.filter(x=>x.exactMemberIds.length>=3).length);
assert.equal(four,compiled.families.filter(x=>x.exactMemberIds.length===4).length);
assert.equal(negative,17);
console.log('PASS: original Forge 15 source-verified sets / 42 original pieces, '+
 two+' two-piece reviews, '+three+' three-piece reviews, '+four+
 ' four-piece reviews; '+negative+
 ' forged/replayed negative checks; zero executable, approved, grantable or marketable set bonuses');
