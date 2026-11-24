import test from 'node:test';
import assert from 'node:assert/strict';
import {authoring,semanticPolicy,validateAuthoring,innateResolution,reachedMilestones,permanentCandidate,combatExperimentPlan,summary} from './set-trait-cp-review-v17.mjs';
const deny=x=>{for(const k of ['cpApproved','mayMint','mayEquip','mayApply','mayTrade','mayDrop','releaseApproved'])assert.equal(x[k],false);};
test('95 exact families, 195 attainable milestones, preserve 68 source effects and author 127 new candidates',()=>{
 const s=validateAuthoring();deny(s);assert.equal(s.sets,95);assert.equal(s.milestones,195);assert.equal(s.typed,127);assert.equal(s.preserved,68);assert.equal(s.traits,27);
 for(const x of authoring.sets){assert.equal(x.mayApply,false);assert(x.milestones.every(e=>e.pieces<=x.memberIds.length));}
});
test('27 exact traits, one family per class across tiers, retain source cooldowns and shield requirements',()=>{
 for(const x of authoring.traits){assert.equal(x.mayApply,false);assert.equal(x.internalCooldownSeconds,x.sourceTrait.cd);assert(x.perOwnerCooldown);}
 assert.equal(new Set(authoring.traits.map(x=>x.sharedTraitFamily)).size,9);
 assert(authoring.traits.filter(x=>x.classId==='BASTION').every(x=>x.requiresEquippedShield));
});
test('all 99 innate lines, 28 proposed semantic changes, no silent haste unit conversion',()=>{
 const i=innateResolution();assert.equal(i.length,99);assert.equal(i.filter(x=>x.status==='PROPOSED_EXPLICIT_SEMANTIC_CHANGE').length,28);
 assert.equal(i.filter(x=>x.requiresReauthor).length,8);assert.equal(i.filter(x=>x.requiresScopeApproval).length,11);
 assert.equal(semanticPolicy.haste_pct.sourceUnit,'relative_percent');assert.equal(semanticPolicy.haste_pct.unit,'percentage_points');
 for(const x of i)deny(x);
});
test('threshold previews reject fabricated or duplicated members; no ownership implied',()=>{
 const s=authoring.sets.find(x=>x.setId==='eq2_t1_breakerforge');
 assert.equal(reachedMilestones(s.memberIds.slice(0,1)).length,0);
 assert.deepEqual(reachedMilestones(s.memberIds).map(x=>x.pieces),[2,4,6]);
 assert.throws(()=>reachedMilestones([s.memberIds[0],s.memberIds[0]]));
 assert.throws(()=>reachedMilestones(['FAKE']));
});
test('candidate permanent index never returns full CP and rejects incomplete loadouts',()=>{
 for(const classId of ['IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER']){
  const p=permanentCandidate({classId,tier:3});deny(p);assert(p.partialPermanentIndex>=p.baseline-.001);assert.equal(p.completePlayerCp,null);
  assert(p.unpricedDomains.includes('conditional_sets'));
 }
 assert.throws(()=>permanentCandidate({classId:'IRONWARDEN',tier:3,pieceIds:[]}));
});
test('972 future encounters, not executed or approved',()=>{
 const p=combatExperimentPlan();assert.equal(p.length,972);
 assert.equal(new Set(p.map(x=>[x.classId,x.specializationIndex,x.bossId,x.strategy,x.gearVariant].join(':'))).size,972);
 for(const x of p){deny(x);assert.equal(x.executed,false);assert(x.requiresVerifiedSource);}
 const s=summary();deny(s);assert.equal(s.executedNewEncounters,0);assert.equal(s.completePlayerCp,null);
 console.log('EQ2_SET_TRAIT_V17 '+JSON.stringify(s));
});
