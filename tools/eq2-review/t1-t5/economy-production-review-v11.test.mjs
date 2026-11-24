import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeComponentEconomy} from './component-economy-review-v9.mjs';
import {materialPlan,t5Preparation,pacing,combinedRecipes,recycleQuote,sourceStress,supplyTargets,summary} from './economy-production-review-v11.mjs';
const rows=proposeComponentEconomy(),t5=rows.filter(x=>x.tier===5),r=t5.find(x=>x.itemId==='EQ2_LAUNCH_T5_OATHPLATE_HELMET'&&x.route==='foundation');
const denied=x=>{for(const k of ['mayCraft','mayMint','mayTrade','mayEquip','releaseApproved'])assert.equal(x[k],false);};
const sum=a=>a.reduce((n,x)=>n+x,0);
test('T5 processing sources: 8 distinct candidate outputs, 1 existing smelt reference, no grant',()=>{
 assert.equal(materialPlan.processing.length,9);assert.equal(new Set(materialPlan.processing.map(x=>x.output)).size,9);
 assert.equal(materialPlan.processing.filter(x=>x.referenceOnly).length,1);
 assert.equal(materialPlan.newRaw.length,2);assert.equal(materialPlan.combat.length,6);
 for(const p of materialPlan.processing){assert.equal(p.sourceRegistered,false);assert.equal(p.craftCombatLevelRequired,0);assert.equal(p.secondaryProfessionRequired,false);assert.equal(p.mayMint,false);assert(p.quantity>=1);}
 for(const x of [...materialPlan.combat,...materialPlan.newRaw.filter(x=>x.kind==='combat')])for(const s of x.sources)assert(s.effectiveChance>0&&s.effectiveChance<1);
});
test('whole-batch T5 expansion of Oathplate helmet, exact source keys and retained leftovers',()=>{
 const p=t5Preparation(r);denied(p);
 assert.equal(p.batches.EQ2_T5_FROSTSTEEL_INGOT,9);assert.equal(p.leftovers.EQ2_T5_FROSTSTEEL_INGOT,0);
 assert.equal(p.batches.FROSTIRON_INGOT,9);assert.equal(p.rawDemand.FROSTIRON,54);
 assert.equal(p.rawDemand.EQ2_T5_RIMEBONE_SHARD,8);assert.equal(p.rawDemand.EQ2_T5_ICEVEIN_SIGIL,2);
 assert.equal(p.rawDemand.EQ2_T5_FROSTWOLF_PELT,12);
 assert.equal(p.sourceGrantVerified,false);assert.equal(p.completePreparation,false);
 const faster=t5Preparation(r,'candidate',1,1.2);
 assert(Math.abs(faster.knownProcessingSeconds-p.knownProcessingSeconds/1.2)<1e-6);
 assert.deepEqual(faster.rawDemand,p.rawDemand);assert.deepEqual(faster.xpBySkill,p.xpBySkill);
 assert.equal(faster.forgeSeconds,p.forgeSeconds);
 for(const x of t5){const z=t5Preparation(x);denied(z);assert(z.knownProcessingSeconds>0);assert(Object.values(z.rawDemand).every(q=>Number.isSafeInteger(q)&&q>0));}
});
test('50 combined recipe candidates use same item source and preserve non-manufactured requirements, split exactly once',()=>{
 const h=combinedRecipes(rows);assert.equal(h.length,50);assert.equal(new Set(h.map(x=>x.key)).size,50);
 for(const x of h){denied(x);const source=rows.find(r=>r.itemId===x.itemId&&r.route===x.route);
 assert.equal(x.directGoldAtAssembly,source.candidateGold);assert.equal(x.assemblySeconds,source.seconds);assert.equal(x.assemblyXp,source.xp);
 assert(x.candidateCost>=x.target-1e-8);assert.equal(sum(x.lanes.map(l=>l.directGold)),0);
 for(const v of x.inputs){assert.equal(sum(x.lanes.flatMap(l=>l.inputs).filter(i=>i.itemId===v.itemId).map(i=>i.quantity)),v.quantity);
 assert(v.quantity>=v.previousV9);if(!['refined','advanced'].includes(v.kind))assert.equal(v.quantity,v.previousV9);}
 assert.equal(x.receiptPolicy,'ONE_TIME_ACCOUNT_BOUND_LANE_RECEIPTS_NO_DISASSEMBLY_OR_REROLL');
 }
});
test('recycle quote never returns gold, combat signatures, binders or advanced components; whole units below source bill',()=>{
 for(const row of rows)for(const rate of [.1,.2,.25]){const q=recycleQuote(row,rate);denied(q);assert.equal(q.maySalvage,false);assert(q.requireOriginalConsumedBill&&q.oneTimeDestroyRequired);
 assert.equal(q.goldReturn+q.rareReturn+q.binderReturn+q.advancedReturn,0);
 for(const ret of q.returns){const src=row.inputs.find(x=>x.itemId===ret.itemId);assert.equal(src.kind,'refined');assert.equal(ret.quantity,Math.floor(src.candidate*rate));assert(ret.quantity<src.candidate);}
 }
});
test('supply targets count each crafted T5 identity once and bound independent source stress',()=>{
 const s=sourceStress(),t=supplyTargets(rows);assert.equal(s.length,45);
 for(const r of s){denied(r);assert(r.expectedUnitsPerHour>0);assert(r.hoursTo90PercentAtLeastOne>0);}
 for(const x of t){denied(x);assert.equal(x.basketItems,96);assert(x.unitsPer100Crafts>0);assert.equal(x.stockTargetTwoBaskets,x.unitsPer100Crafts*2);assert.equal(x.supplyVerified,false);}
 assert(t.some(x=>x.id==='EQ2_T5_ICEVEIN_SIGIL'));assert(t.some(x=>x.id==='EQ2_T5_FROSTFLAX'));
 const p=pacing();assert.equal(p.length,5);assert(p[4].before>0);assert(p.every(x=>x.after>=x.before&&x.xpPerHourFactor===1.2));
 const result=summary();denied(result);assert.equal(result.t5Routes,182);assert.equal(result.salvageQuotes,928);
 console.log('EQ2_ECONOMY_V11 '+JSON.stringify(result));
});
