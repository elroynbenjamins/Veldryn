import test from 'node:test';
import assert from 'node:assert/strict';
import {profiles,basePreview,premiumComparisons,mixedPremiumFixtures,setCoverage,semanticCandidates,summary} from './profile-premium-review-v16.mjs';
const deny=r=>{for(const k of ['cpApproved','mayCraft','mayMint','mayEquip','mayDrop','mayTrade','mayApplyEffects','releaseApproved'])assert.equal(r[k],false);};
test('all 554 exact identities; no duplicate, retired or future profiles',()=>{
 const r=profiles();assert.equal(r.length,554);assert.equal(new Set(r.map(x=>x.itemId)).size,554);
 for(const x of r){deny(x);assert(x.tier>=1&&x.tier<=5);assert(x.profile);}
 const s=summary();deny(s);assert.equal(s.preserved,233);assert.deepEqual(s.basis,{V5_PRESERVED:233,...Object.fromEntries(Object.entries(s.basis).filter(([k])=>k!=='V5_PRESERVED'))});
 assert.equal(s.basis.V3_EXACT_RECIPE_PROFILE,204);assert.equal(s.basis.EXACT_SOURCE_PROFILE,22);assert.equal(s.basis.ROLE_SLOT_PROFILE_CANDIDATE,56);assert.equal(s.basis.MATCHED_CLASS_SLOT_PROFILE_CANDIDATE,39);
 assert.equal(s.bossOnly,79);assert.equal(s.blueprintUnresolved,6);
});
test('budget and rarity/quality applied once; source-authored blueprint boosts only',()=>{
 for(const x of profiles()){
  const a=basePreview(x,'common',0),b=basePreview(x,'common',100);deny(a);deny(b);
  assert(Math.abs(b.base/a.base-1.25/.75)<.001);assert(Math.abs(a.base-(a.attack+a.defense+a.hp/4))<.001);
  assert.equal(a.budgetLanes,x.slot==='weapon'&&['two','dual'].includes(x.hands)?2:1);
  if(x.bossOnly)assert.equal(a.basePremiumPct,0);
 }
 assert.equal(profiles().filter(x=>x.baseBudgetMultiplier>1).length,6);
 assert.throws(()=>basePreview(profiles()[0],'invalid'));
});
test('premium source counts and unapproved semantics remain separate',()=>{
 const r=premiumComparisons();assert.equal(r.length,105);assert.equal(r.filter(x=>x.basePremiumPct>0).length,6);
 for(const x of r){deny(x);assert.equal(x.totalPremiumApproved,false);}
 const s=setCoverage();assert.equal(s.length,95);assert.equal(s.filter(x=>x.hasNumericSource).length,34);
 for(const x of s)deny(x);
 assert.equal(semanticCandidates.length,5);assert.equal(semanticCandidates.find(x=>x.source==='haste_pct').candidate,null);
 assert.equal(semanticCandidates.find(x=>x.source==='healing_power_pct').candidate,null);
});
test('259 matched slot sensitivity fixtures across nine classes; no actual combat or set effect claim',()=>{
 const r=mixedPremiumFixtures();assert.equal(r.length,259);assert.equal(new Set(r.map(x=>x.classId)).size,9);
 for(const x of r){deny(x);assert(x.partialDeltaPct>=-.001&&x.partialDeltaPct<2.62);assert(x.setEffectsUnpriced&&x.skillEffectsUnpriced);}
 assert.equal(summary().mixedPremiumFixtures,259);
 console.log('EQ2_PROFILE_V16 '+JSON.stringify(summary()));
});
