import test from 'node:test';
import assert from 'node:assert/strict';
import {contract,inspectPower,powerGrid,mixedHands,premiumChannelAudit,scopeAudit,summarizePower} from './equipment-power-contract-review-v15.mjs';
const deny=r=>{for(const k of ['cpApproved','mayCraft','mayMint','mayDrop','mayEquip','mayTrade','mayApplyEffects','releaseApproved'])assert.equal(r[k],false);};
const approx=(a,b)=>assert(Math.abs(a-b)<.001,a+' vs '+b);
test('ten budget lanes, independent secondary grades, same full budget across physical hand configurations',()=>{
 const a=inspectPower({classId:'IRONWARDEN',tier:5,grade:'mythic',quality:100,secondaryGrade:'common',secondaryQuality:0});
 const b=inspectPower({classId:'DREADGUARD',tier:5,grade:'mythic',quality:100,secondaryGrade:'common',secondaryQuality:0});
 deny(a);deny(b);assert.equal(a.physicalPieces,10);assert.equal(b.physicalPieces,9);
 assert.equal(a.budgetLanes,10);assert.equal(b.budgetLanes,10);
 assert.equal(b.lanes.find(x=>x.slot==='offhand').grade,'common');assert.equal(b.lanes.find(x=>x.slot==='offhand').quality,0);
 assert.equal(b.lanes.find(x=>x.slot==='offhand').itemId,b.lanes.find(x=>x.slot==='weapon').itemId);
 approx(a.base,b.base);approx(a.partialPower,b.partialPower);
 const high=inspectPower({classId:'DREADGUARD',tier:5,grade:'mythic',quality:100});
 assert(high.partialPower>b.partialPower);
});
test('quality only scales base, channels unchanged, rarity and tier monotonic for matched fixtures',()=>{
 for(let t=1;t<=5;t++){
  const low=inspectPower({classId:'HEXWEAVER',tier:t,quality:0}),high=inspectPower({classId:'HEXWEAVER',tier:t,quality:100});
  assert.deepEqual(low.channels,high.channels);approx(high.base/low.base,1.25/.75);
  const common=inspectPower({classId:'HEXWEAVER',tier:t,grade:'common'}),mythic=inspectPower({classId:'HEXWEAVER',tier:t,grade:'mythic'});
  assert(mythic.partialPower>common.partialPower);
  if(t>1)assert(low.partialPower>inspectPower({classId:'HEXWEAVER',tier:t-1,quality:0}).partialPower);
 }
 assert.throws(()=>inspectPower({classId:'HEXWEAVER',tier:6}));assert.throws(()=>inspectPower({classId:'HEXWEAVER',tier:1,quality:101}));deny(contract);
});
test('partial score explicitly unprices set, gem, skill, companion, progression and unresolved effects',()=>{
 const a=inspectPower({classId:'RAVAGER',tier:3});
 approx(a.partialPower,a.base+a.permanentContribution);
 assert(a.unpricedDomains.includes('set_effects'));assert(a.unpricedDomains.includes('skills'));assert(a.unpricedDomains.includes('unresolved_innates'));deny(a);
 const p=premiumChannelAudit();assert.equal(p.length,99);assert.equal(p.flatMap(x=>x.mapped).length,71);assert.equal(p.flatMap(x=>x.unpriced).length,28);assert.equal(p.filter(x=>x.traitUnpriced).length,27);
 for(const x of p)deny(x);
});
test('no invented profiles or premium performance claims; exact roster coverage',()=>{
 const s=scopeAudit();deny(s);assert.equal(s.catalogue,554);assert.equal(s.profiled,233);assert.equal(s.unprofiled.length,321);assert.equal(s.premiumInBenchmarkFixtures,0);assert.equal(s.setsAudited,34);assert.equal(s.setsOutsideAudit,61);
});
test('9720 matched grade fixtures plus 4860 mixed grade hand fixtures, matched scalar parity not combat parity',()=>{
 const s=summarizePower();deny(s);assert.equal(s.scenarios,9720);assert.equal(s.mixedScenarios,4860);assert.equal(s.groups,1080);assert(s.maxHandGapPct<.01);
 assert.equal(s.overlapComparisons,36);assert.equal(s.lowerMythicExceedsHigherCommon,36);
 assert.equal(powerGrid().length,9720);assert.equal(mixedHands().length,4860);
 console.log('EQ2_POWER_V15 '+JSON.stringify({...s,scope:{...s.scope,unprofiled:s.scope.unprofiled.length}}));
});
