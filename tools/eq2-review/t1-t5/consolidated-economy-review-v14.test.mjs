import test from 'node:test';
import assert from 'node:assert/strict';
import {index,verifyPins,reviewCatalog,canonicalGathering,canonicalSupply,canonicalSalvagePreview,summary} from './consolidated-economy-review-v14.mjs';
const deny=x=>{for(const k of Object.keys(index.noAuthority))assert.equal(x[k],false);assert.equal(x.releaseApproved,false);};
test('all original and current contract blobs pinned exactly, no release authority',()=>{
 const p=verifyPins();assert.equal(p.pins,21);deny(p);
 assert.equal(index.releaseActivation,false);
 assert.equal(index.contracts.filter(x=>x.status==='CONFIRMED_DIRECTION_ONLY').length,1);
});
test('554 exact identities, 928 routes, boss and missing blueprint recipes fail closed',()=>{
 const items=reviewCatalog();assert.equal(items.length,554);assert.equal(items.filter(x=>x.sourceClass==='BOSS_ONLY').length,79);
 assert.equal(items.filter(x=>x.sourceClass==='BLUEPRINT_UNRESOLVED').length,6);
 assert.equal(items.filter(x=>x.sourceClass==='CRAFT_REVIEW').length,469);
 const routes=items.flatMap(x=>x.recipes);assert.equal(routes.length,928);
 assert.equal(new Set(routes.map(x=>x.sourceId)).size,928);
 for(const x of items){deny(x);if(x.sourceClass!=='CRAFT_REVIEW')assert.equal(x.recipes.length,0);}
 for(const r of routes){deny(r);assert(!r.ingredients.some(x=>['EQ2_COPPER_BAR','EQ2_IRON_BAR'].includes(x.itemId)));assert(r.ingredients.every(x=>Number.isSafeInteger(x.quantity)&&x.quantity>0));}
});
test('current source rate and location reconcile without enabling grants',()=>{
 const g=canonicalGathering();assert.equal(g.length,8);
 const flax=g.find(x=>x.id==='EQ2_T5_FROSTFLAX');assert.equal(flax.zone,'FROSTMARCH');assert.equal(flax.area,'ZONE_011');assert.equal(flax.seconds,130);assert.equal(flax.quantity,1);
 for(const x of g){deny(x);assert.equal(x.sourceRegistered,false);assert(x.zone);}
});
test('current raw baskets choose each item once, combined scenario replaces rather than adds',()=>{
 const a=canonicalSupply(),b=canonicalSupply('pending1693','combined_alternative'),s=canonicalSupply('snapshot');
 assert.equal(a.reduce((n,x)=>n+x.items,0),469);
 assert.equal(b.reduce((n,x)=>n+x.items,0),469);
 assert.equal(a[4].items,96);
 for(let i=0;i<5;i++){deny(a[i]);deny(b[i]);assert(b[i].processingGoldPer100>=a[i].processingGoldPer100);
 assert.equal(b[i].forgeGoldPer100,a[i].forgeGoldPer100);assert(Object.values(a[i].unitsPer100Crafts).every(n=>n>0));}
 assert(a[0].unitsPer100Crafts.COPPER_ORE>s[0].unitsPer100Crafts.COPPER_ORE);
 assert.throws(()=>canonicalSupply('pending1693','both'));
});
test('salvage uses normalized candidate identity only, never grants from preview',()=>{
 const r=reviewCatalog().flatMap(x=>x.recipes).find(x=>x.sourceId==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
 const s=canonicalSalvagePreview(r);deny(s);assert.equal(s.maySalvage,false);
 assert(s.returns.some(x=>x.itemId==='COPPER_INGOT'&&x.quantity===3));assert(!s.returns.some(x=>x.itemId==='EQ2_COPPER_BAR'));
 assert.equal(s.goldReturn,0);assert(s.requireActualImmutableConsumedBill);assert.throws(()=>canonicalSalvagePreview({ingredients:[]}));
});
test('canonical summary covers all current contracts without opening D1-D10',()=>{
 const s=summary();deny(s);assert.deepEqual(s.counts,index.expected);assert.equal(s.auditedCraftRoutes,928);assert.equal(s.launchDecision,'BLOCKED_D1_D10');
 console.log('EQ2_CONSOLIDATED_V14 '+JSON.stringify({counts:s.counts,pins:s.pins,gatheringCandidates:s.gatheringCandidates,sourceStressCases:s.sourceStressCases}));
});
