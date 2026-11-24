import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeComponentEconomy} from './component-economy-review-v9.mjs';
import {assumptions,preparation,materialValue,economics,handComparisons,simulateProfile,summarizeEconomy} from './economy-simulation-review-v10.mjs';
const rows=proposeComponentEconomy();
const ravager=rows.find(r=>r.sourceId==='EQ2_WEAPON_T4_RAVAGER_FOUNDATION');
const deny=r=>{for(const k of ['mayCraft','mayMint','mayTrade','mayEquip','releaseApproved'])assert.equal(r[k],false);assert.equal(r.reviewOnly,true);};
const approx=(a,b)=>assert(Math.abs(a-b)<1e-7,a+' vs '+b);
test('recursive T4 preparation, whole batches, leftovers, same XP and queue for throughput sensitivity',()=>{
 const p=preparation(ravager);
 assert.equal(p.batches.SUNSTONE_INGOT,50);assert.equal(p.leftover.SUNSTONE_INGOT,2);
 assert.equal(p.raw.SUNSTONE_ORE,300);assert.equal(p.raw.DUNEWOOD,335);assert.equal(p.raw.EQ2_GLASSBOUND_DUST,116);
 assert.equal(p.raw.EQ2_SUNSCAR_HIDE,60);
 assert.equal(p.unexpanded.EQ2_GLASSBOUND_PLATE,18);assert.equal(p.unexpanded.EQ2_GLASSHEART_FRAGMENT,2);assert.equal(p.unexpanded.GLASSBOUND_BINDER,2);
 assert.equal(p.forgeSeconds,891);assert.equal(p.completePreparation,false);
 const faster=preparation(ravager,'candidate',1,1.2);
 approx(faster.knownProcessingSeconds,p.knownProcessingSeconds/1.2);assert.deepEqual(faster.xpBySkill,p.xpBySkill);assert.deepEqual(faster.raw,p.raw);
 assert.equal(faster.forgeSeconds,p.forgeSeconds);
 const two=preparation(ravager,'candidate',2);
 assert.equal(two.batches.SUNSTONE_INGOT,99);assert.equal(two.leftover.SUNSTONE_INGOT,1);
 assert(two.knownProcessingSeconds<2*p.knownProcessingSeconds);deny(p);
});
test('all 928 routes preserve incomplete source status and no T5 invented processing',()=>{
 assert.equal(rows.length,928);
 for(const r of rows){const p=preparation(r);deny(p);assert.equal(p.sourceRateVerified,false);
 assert(p.knownProcessingSeconds>=preparation(r,'previous').knownProcessingSeconds);
 if(r.tier===5){assert.equal(p.knownProcessingSeconds,0);assert(Object.keys(p.unexpanded).length>0);}
 }
 assert.throws(()=>preparation(ravager,'candidate',0));assert.throws(()=>preparation(ravager,'candidate',1,3));
});
test('all six rarity outcomes form one distribution; sale or salvage, no double recovery',()=>{
 const e=economics(ravager);deny(e);approx(e.outcomes.reduce((s,x)=>s+x.p,0),1);
 for(const x of e.outcomes){assert.equal(x.unsoldNet,0);approx(x.expectedNet,x.p*x.s*x.saleNet);}
 approx(e.materials,materialValue(ravager));approx(e.cost,e.gold+e.materials);
 approx(e.expectedNet,e.outcomes.reduce((s,x)=>s+x.expectedNet,0));
 approx(e.guaranteedSaleBreakEven*.95,e.cost);
 const salv=economics(ravager,'candidate',1,.05,.25);
 assert(salv.expectedNet>e.expectedNet);assert(salv.breakEvenUniformAskScale<e.breakEvenUniformAskScale);
 for(const x of salv.outcomes)approx(x.expectedNet,x.p*(x.s*x.saleNet+(1-x.s)*x.unsoldNet));
 assert(economics(ravager,'candidate',1,.1,0).profit<e.profit);
 assert.throws(()=>economics(ravager,'candidate',1,.99,0));
});
test('60 source-paired comparisons preserve discounted direct fee, material parity target, independent receipts',()=>{
 const h=handComparisons(rows);assert.equal(h.length,60);
 for(const x of h){deny(x);assert(x.costRatio>0);assert(x.additionalComponentValue>=0);
 approx(x.combinedCost+x.additionalComponentValue,Math.max(x.combinedCost,x.pairCost));
 assert.equal(x.rarity.separateLaneExpectedTotalCrafts,2000);
 assert.equal(x.rarity.independentSameCraftExpectedCrafts,1000000);
 assert.equal(x.independentLanePolicy,'TWO_RETAINED_MATERIAL_RECEIPTS_NO_SECOND_EQUIPPABLE_ITEM');}
});
test('profession-only profile buys combat, no other profession gate and no claimed live supply',()=>{
 const p=assumptions.profiles.find(x=>x.id==='profession_specialist');
 const x=simulateProfile(ravager,p);deny(x);assert.equal(x.combatProgressionRequired,false);assert.equal(x.requiresSecondaryProfession,false);
 assert(x.assumesMarketSupply);assert(x.cash>ravager.candidateGold);assert(x.fullOpportunityCost>=x.cash);
 approx(x.effortHours,x.ownHours+x.fundingHours+x.forgeHours);
 assert(simulateProfile(ravager,p,2).cash>x.cash);
 assert.throws(()=>simulateProfile(ravager,{id:'fake'}));
});
test('full scenario coverage and no implicit launch authorization',()=>{
 const s=summarizeEconomy();deny(s);assert.equal(s.routes,928);assert.equal(s.scenarioCount,8352);assert.equal(s.marketStressCases,25056);
 assert.equal(s.byTier.length,5);assert.equal(s.handComparisons,60);
 for(const t of s.byTier){assert.equal(t.marketStress.length,27);assert.equal(t.profiles.length,3);assert.equal(t.incompletePrepRoutes,t.routes);}
 console.log('EQ2_ECONOMY_V10 '+JSON.stringify({...s,byTier:s.byTier.map(({marketStress,...tier})=>({...tier,baselineMarket:marketStress.find(x=>x.stress===1&&x.fee===.05&&x.salvage===0)}))}));
});
