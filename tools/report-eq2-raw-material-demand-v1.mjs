#!/usr/bin/env node
/**
 * Read-only, conservative ingredient demand model for 746 REVIEW-ONLY EQ2
 * routes. It is NOT a player crafting forecast, an item grant or a price model.
 * Aggregation scenario: forge precisely ONE copy of EVERY proposed item ID
 * (373 items), entirely by foundation routes or entirely by alternate routes.
 * Processing is pooled per tier and rounded up to real output batch sizes.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const load=(path)=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const book=load('docs/equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json');
const policy=load('docs/2-0/resource-sinks-equipment-guild-v1.json');
const processes=new Map(book.processingReview.map(p=>[p.output,p]));
assert.equal(book.recipes.length,746);
assert.equal(processes.size,book.processingReview.length);
assert.equal(policy.equipmentRecipePolicy.routeTotal,book.recipes.length);

const rawWood=new Set(['GREENWOOD_LOG','IRONWOOD_LOG','DUNEWOOD','CROWNWOOD_LOG']);
const rawOre=new Set(['COPPER_ORE','ASTER_IRON_ORE','SUNSTONE_ORE','OATHSTONE_ORE']);
function rawEquivalent(crafts) {
 const totals=new Map();
 const add=(item,amount)=>totals.set(item,(totals.get(item)??0)+amount);
 for(const recipe of crafts){
  assert(recipe.reviewOnly===true&&recipe.craftable===false&&recipe.mayMint===false);
  for(const row of recipe.inputs) add(row.itemId,row.quantity);
 }
 // Process any output that has a registered draft cost, recursively, with
 // aggregate batch rounding. This is optimistic shared-workshop pooling.
 let iterations=0;
 while([...totals.keys()].some(item=>processes.has(item))){
  if(++iterations>20)throw new Error('processing_cycle_or_unresolved_batch');
  for(const [output,process] of processes){
   const qty=totals.get(output)??0;
   if(qty===0)continue;
   assert(process.reviewOnly===true && Number.isSafeInteger(process.quantity) && process.quantity>0);
   const batches=Math.ceil(qty/process.quantity);
   totals.delete(output);
   for(const [input,amount] of Object.entries(process.inputs))add(input,batches*amount);
  }
 }
 return totals;
}
const recipesByKey=new Map();
for(const row of book.recipes){
 assert(['foundation','alternate'].includes(row.route));
 const key=row.pieceId+':'+row.route;
 if(recipesByKey.has(key))throw new Error('duplicate_recipe_route:'+key);
 recipesByKey.set(key,row);
}
const perTier=[];
for(const tier of [1,2,3,4]){
 for(const route of ['foundation','alternate']){
  const recipes=book.recipes.filter(r=>r.tier===tier&&r.route===route);
  const raw=rawEquivalent(recipes);
  const wood=Object.fromEntries([...raw].filter(([k])=>rawWood.has(k)));
  const ore=Object.fromEntries([...raw].filter(([k])=>rawOre.has(k)));
  const hides=Object.fromEntries([...raw].filter(([k])=>/HIDE|PELT/.test(k)));
  const fibre=Object.fromEntries([...raw].filter(([k])=>/FIBER|FIBRE/.test(k)));
  const blockers=Object.fromEntries([...raw].filter(([k])=>k.startsWith('EQ2_')));
  const woodPieces=recipes.filter(r=>r.inputs.some(x=>/_LOG$|_PLANK$|DUNEWOOD/.test(x.itemId))).length;
  const totalGold=recipes.reduce((s,r)=>s+r.gold,0);
  perTier.push({tier,route,items:recipes.length,woodPieces,wood,ore,hides,fibre,
    unregisteredInputs:blockers,totalGold});
 }
}
assert.equal(perTier.filter(x=>x.route==='foundation').reduce((sum,x)=>sum+x.items,0),373);
assert.equal(perTier.filter(x=>x.route==='alternate').reduce((sum,x)=>sum+x.items,0),373);
const observedWoodRoutes=book.recipes.filter(r=>r.inputs.some(x=>/_LOG$|_PLANK$|DUNEWOOD/.test(x.itemId))).length;
assert.equal(observedWoodRoutes,472);
assert.equal(book.recipes.every(r=>r.inputs.some(x=>x.itemId.includes('BINDER')||
 x.itemId.includes('BINDING_RESIN'))),true);
const absolute=[...perTier].map(x=>({
 tier:x.tier,route:x.route,items:x.items,woodPieces:x.woodPieces,
 rawTimber:[...Object.values(x.wood)].reduce((s,n)=>s+n,0),
 rawOre:[...Object.values(x.ore)].reduce((s,n)=>s+n,0),
 unregisteredMaterialCount:Object.keys(x.unregisteredInputs).length,
 gold:x.totalGold,
}));
console.log(JSON.stringify({
 schema:'veldryn-eq2-raw-material-demand-readonly-v1',
 model:'ONE_COPY_OF_EACH_OF_373_UNISSUABLE_ITEMS_PER_ROUTE; POOLED_PROCESSING_BATCHES',
 warning:'Not production throughput or expected demand. Does not include rare loot availability, market substitution, NPC sales or item-crafting success odds.',
 totalDraftRecipes:book.recipes.length,
 timberUsingRoutes:observedWoodRoutes,
 sample: absolute,
 rawDetails:perTier.map(({tier,route,wood,ore})=>({tier,route,wood,ore})),
},null,2));
