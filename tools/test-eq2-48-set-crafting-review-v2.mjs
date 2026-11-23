#!/usr/bin/env node
/**
 * Hidden Equipment/Crafting 2.0 review — SOURCE AND AUTHORING CHECK ONLY.
 * Never imports, registers or grants review items. Run:
 *   node tools/test-eq2-48-set-crafting-review-v2.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const review=JSON.parse(read('docs/equipment-2-0/t1-t4-48-set-unified-recipe-review-v2.json'));
const getArray=(file,name)=>{
  const s=read(file),start=s.indexOf(name);
  assert.ok(start>=0,'missing '+name);
  const open=s.indexOf('=[',start),end=s.indexOf('];',open);
  assert.ok(open>=0&&end>=0,'missing literal '+name);
  return JSON.parse(s.slice(open+1,end+1));
};
const sources=[
  ['equipment-crafting-v2-manifest.ts','V2_SERVER_CORE_PIECES','V2_SERVER_CORE_RECIPES'],
  ['equipment-crafting-v2-expansion-manifest.ts','V2_SERVER_EXPANSION_PIECES','V2_SERVER_EXPANSION_RECIPES'],
  ['equipment-crafting-v2-armament-manifest.ts','V2_SERVER_ARMAMENT_PIECES','V2_SERVER_ARMAMENT_RECIPES'],
].map(([file,items,recipes])=>({
  file:'backend/src/server/equipment/'+file,items,recipes,
}));
const existing=sources.flatMap(x=>getArray(x.file,x.items));
const originals=sources.flatMap(x=>getArray(x.file,x.recipes));
const oldItems=new Map(existing.map(x=>[x.id,x]));
const oldRoutes=new Map(originals.map(x=>[x.id,x]));
assert.equal(existing.length,169);
assert.equal(originals.length,338);
const s=read('backend/src/server/combat/v2/set-catalog.ts');
const families=[...s.matchAll(/\{id:'([^']+)',role:'([^']+)',slots:\[([^\]]+)\],thresholds:\[([^\]]+)\]\}/g)]
  .map(m=>({id:m[1],role:m[2],slots:[...m[3].matchAll(/'([^']+)'/g)].map(y=>y[1])}));
assert.equal(families.length,12);
const planned=[1,2,3,4].flatMap(t=>families.flatMap(f=>f.slots.map(slot=>({
  id:'EQ2_LAUNCH_T'+t+'_'+f.id.toUpperCase()+'_'+slot.toUpperCase(),
  setId:'eq2_t'+t+'_'+f.id,tier:t,role:f.role,slot,
}))));
assert.equal(planned.length,204);
const plannedById=new Map(planned.map(m=>[m.id,m]));
assert.equal(plannedById.size,204);
assert.equal(review.status,'REVIEW_ONLY_NONISSUABLE_SOURCE_GAPS_OPEN');
assert.equal(review.summary.totalRecipeReviews,746);
assert.equal(review.summary.totalDistinctDraftPieceIds,373);
assert.equal(review.processingReview.length,16);
assert.equal(review.processingReview.filter(x=>x.output==='SUNSTONE_INGOT'&&
  x.conflict==='EXISTING_SMELT_SUNSTONE_INGOT_UNRESOLVED').length,1);
assert.equal(review.assumptions.noCraftCombatLevel,true);
assert.equal(review.assumptions.tradeableComponentsOrPlayerCommissions,true);
assert.equal(review.recipes.length,746);
const routeIds=new Set(),byPiece=new Map(),usedSource=new Set();
const common={1:'EQ2_BOAR_TUSK',2:'WOLF_FANG',3:'EQ2_SUNSCAR_SCALE',4:'EQ2_GLASSBOUND_PLATE'};
const scarce={1:'EQ2_VERDANT_ESSENCE',2:'EQ2_TROLL_SINEW',3:'EQ2_MIRAGEFANG_CORE',4:'EQ2_GLASSHEART_FRAGMENT'};
const binder={1:'VERDANT_BINDING_RESIN',2:'IRONWOOD_BINDING_RESIN',3:'SUNSCAR_DUNE_BINDER',4:'GLASSBOUND_BINDER'};
const rareSlots={1:[],2:['chest','legs','weapon'],3:['chest','legs','weapon','helmet','offhand'],
 4:['chest','legs','weapon','offhand','helmet','gloves','boots','cape','ring','amulet']};
for(const r of review.recipes){
 assert.ok(!routeIds.has(r.id),'duplicate '+r.id);routeIds.add(r.id);
 assert.equal(r.reviewOnly,true);
 assert.equal(r.craftable,false);
 assert.equal(r.mayMint,false);
 assert.equal(r.craftCombatLevelRequired,0);
 assert.ok(Number.isInteger(r.professionLevel)&&r.professionLevel>0);
 assert.ok(Number.isInteger(r.gold)&&r.gold>0&&Number.isInteger(r.xp)&&r.xp>0);
 assert.ok(Number.isInteger(r.seconds)&&r.seconds>0);
 assert.ok(['smithing','tailoring'].includes(r.profession));
 assert.ok(['foundation','alternate'].includes(r.route));
 assert.ok(r.inputs.length>=5);
 assert.equal(new Set(r.inputs.map(x=>x.itemId)).size,r.inputs.length,'duplicate material '+r.id);
 assert.ok(r.inputs.every(x=>x.itemId&&Number.isInteger(x.quantity)&&x.quantity>0));
 assert.ok(r.inputs.some(x=>x.itemId===common[r.tier]),'no ordinary combat source '+r.id);
 assert.ok(r.inputs.some(x=>x.itemId===binder[r.tier]),'no binder '+r.id);
 const item=r.group==='existing_169'?oldItems.get(r.pieceId):plannedById.get(r.pieceId);
 assert.ok(item,'not present in reviewed source '+r.pieceId);
 assert.equal(r.tier,item.tier);
 const slot=r.group==='existing_169'?item.slot:r.slot;
 if(rareSlots[r.tier].includes(slot))
   assert.ok(r.inputs.some(x=>x.itemId===scarce[r.tier]),'scarce bypass '+r.id);
 if(!byPiece.has(r.pieceId))byPiece.set(r.pieceId,[]);
 byPiece.get(r.pieceId).push(r);
 if(r.group==='existing_169'){
   const baseline=oldRoutes.get(r.id);
   assert.ok(baseline,'not original recipe '+r.id);
   for(const k of ['tier','route','profession','gold','xp','seconds','professionLevel'])
     assert.equal(r[k],baseline[k],'legacy '+k+' changed '+r.id);
   assert.equal(r.originalCharacterLevelGate,baseline.characterLevel);
   assert.equal(r.equipCombatLevelCandidate,baseline.characterLevel);
 }else{
   assert.equal(r.group,'expanded_48_sets');
   assert.equal(r.setId,item.setId);
   assert.equal(r.role,item.role);
   assert.equal(r.slot,item.slot);
   assert.ok(r.gold%100===0,'set Gold must round to 100');
   assert.equal(r.equipCombatLevelCandidate,({1:2,2:12,3:26,4:40})[r.tier]);
   if(r.candidateSourceId){
     const source=oldItems.get(r.candidateSourceId);
     assert.ok(source&&!source.setId&&!source.classRestriction,'protected old source');
     assert.equal(source.tier,r.tier);
     assert.equal(source.role,r.role);
     assert.equal(source.slot,r.slot);
     assert.equal(r.templateStatus,'POTENTIAL_UNAPPROVED_EXISTING_SOURCE');
   }else{
     assert.equal(r.templateStatus,'NEW_ITEM_AUTHORING_REQUIRED');
   }
 }
}
assert.equal(byPiece.size,373);
assert.equal(routeIds.size,746);
let oldCount=0,newCount=0;
for(const [pieceId,rows] of byPiece){
 assert.equal(rows.length,2,'exactly two routes '+pieceId);
 assert.deepEqual(new Set(rows.map(x=>x.route)),new Set(['foundation','alternate']));
 const [a,b]=rows;
 for(const k of ['gold','xp','seconds','professionLevel','craftCombatLevelRequired','equipCombatLevelCandidate'])
   assert.equal(a[k],b[k],'route cannot bypass '+k+' on '+pieceId);
 // Existing pinned drafts intentionally allow different professions by route.
 // Preserve that useful specialization choice; new 48-set rows keep one profession.
 if(a.group==='expanded_48_sets')assert.equal(a.profession,b.profession);
 for(const id of [common[a.tier],scarce[a.tier],binder[a.tier]]){
   const qty=r=>r.inputs.find(x=>x.itemId===id)?.quantity||0;
   assert.equal(qty(a),qty(b),'route must not bypass scarce/common/binder '+pieceId);
 }
 if(a.group==='existing_169')oldCount++;
 else {
   newCount++;
   if(a.candidateSourceId){
     assert.ok(!usedSource.has(a.candidateSourceId),'source candidate reused');
     usedSource.add(a.candidateSourceId);
   }
 }
}
assert.equal(oldCount,169);assert.equal(newCount,204);
assert.equal(usedSource.size,74);
assert.equal(newCount-usedSource.size,130);
assert.equal([...byPiece.keys()].filter(id=>!oldItems.has(id)).length,204);
assert.deepEqual(review.summary.tiers.map(x=>[x.oldItems,x.newMembers,x.newRecipeRoutes]),
  [[37,51,102],[43,51,102],[43,51,102],[46,51,102]]);
console.log('PASS: 169 existing + 204 expanded review-only identities, 746 total recipes; '+ 
  '74 unapproved links, 130 missing sources; no trade/combat-gate bypass or live unlock');
