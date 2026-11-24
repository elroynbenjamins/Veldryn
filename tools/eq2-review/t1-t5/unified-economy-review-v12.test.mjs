import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeComponentEconomy} from './component-economy-review-v9.mjs';
import {policy,processingRegistry,materialCatalogue,fullBill,accessAudit,summary} from './unified-economy-review-v12.mjs';
const rows=proposeComponentEconomy(),first=rows.find(x=>x.sourceId==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
const deny=x=>{for(const k of ['mayCraft','mayMint','mayDrop','mayTrade','releaseApproved'])assert.equal(x[k],false);};
test('one recipe reference per output; duplicate early bars excluded only in reuse candidate',()=>{
 const a=processingRegistry('baseline'),b=processingRegistry('reuse_candidate');
 assert.equal(a.length,29);assert.equal(b.length,29);
 assert.equal(new Set(b.map(x=>x.output)).size,29);
 assert(a.some(x=>x.output==='EQ2_COPPER_BAR'));assert(!b.some(x=>x.output==='EQ2_COPPER_BAR'));
 assert(b.some(x=>x.output==='COPPER_INGOT'&&x.referenceOnly));
 assert(b.some(x=>x.output==='ASTER_IRON_INGOT'&&x.referenceOnly));
 assert.equal(b.filter(x=>x.referenceOnly).length,8);
 assert.equal(b.filter(x=>!x.referenceOnly).length,21);
 for(const p of [...a,...b])deny(p);
 assert.throws(()=>processingRegistry('runtime'));
});
test('pending 1693 inputs are separate scenario, no modification of source or finished quantities',()=>{
 const a=processingRegistry('reuse_candidate'),b=processingRegistry('reuse_candidate','pending1693');
 for(const x of policy.smelts){const p=a.find(y=>y.output===x.output),q=b.find(y=>y.output===x.output);
 assert.deepEqual(p.inputs,x.inputs);assert.deepEqual(q.inputs,x.pending1693.inputs);
 assert.equal(p.quantity,q.quantity);assert.equal(p.seconds,q.seconds);assert.equal(q.xp,x.pending1693.xp);}
 const base=fullBill(first,'baseline'),reuse=fullBill(first),pending=fullBill(first,'reuse_candidate','pending1693');
 assert.equal(base.raw.COPPER_ORE,48);assert.equal(reuse.raw.COPPER_ORE,40);assert.equal(pending.raw.COPPER_ORE,60);
 assert.equal(reuse.leftovers.COPPER_INGOT,4);
 assert.equal(base.finalForgeGold,reuse.finalForgeGold);assert.equal(reuse.finalForgeGold,pending.finalForgeGold);
 assert.equal(first.inputs.find(x=>x.itemId==='EQ2_COPPER_BAR').candidate,16);
});
test('all 928 source bills and exact identity consumers, no missing quantities or authority',()=>{
 const c=materialCatalogue(),index=new Map(c.map(x=>[x.id,x]));
 assert.equal(new Set(c.map(x=>x.id)).size,c.length);
 assert.equal(index.get('EQ2_VERDANT_ESSENCE').status,'DORMANT_NO_RECIPE_CONSUMER');
 assert.equal(index.get('MOSS_FIBER').status,'SOURCE_GAP');
 assert.equal(index.get('THORN_SAP').status,'SOURCE_GAP');
 assert(index.get('WINTERMINT').sourceEvidence.some(x=>x.source==='WINTERMINT_PATCH'&&x.level===48));
 assert(index.get('EQ2_SUNSCAR_HIDE').sourceEvidence.some(x=>x.sourceId==='EQ2_DUNE_HARE'&&x.newEnemyConcept));
 for(const r of rows){
  const b=fullBill(r);deny(b);assert.equal(b.totalCostComplete,false);
  for(const [id,q] of Object.entries(b.raw)){assert(index.has(id),id);assert(Number.isSafeInteger(q)&&q>0);}
  assert(Object.keys(b.batches).length>0);
 }
 for(const x of c)deny(x);
});
test('profession access audit distinguishes self-production gaps from combat requirements',()=>{
 const a=accessAudit();assert.equal(a.length,928);
 for(const r of a){deny(r);assert.equal(r.craftCombatLevelRequired,0);assert.equal(r.secondaryProfessionRequired,false);}
 assert(a.some(x=>x.tier===3&&x.laterProcessingRequirements.some(g=>g.id==='SUNSTONE_INGOT')));
 assert(a.some(x=>x.tier===5&&x.laterGatheringRequirements.some(g=>g.id==='WINTERMINT')));
 const s=summary();deny(s);assert.equal(s.routes,928);assert.equal(s.processingReferences,29);
 console.log('EQ2_UNIFIED_V12 '+JSON.stringify(s));
});
