#!/usr/bin/env node
/**
 * Strict read-only source and recipe parity audit for the 204-set-member,
 * 746-route T1–T4 Equipment/Crafting 2.0 preview. Not an item publisher.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base='docs/equipment-2-0/';
const prev=load(base+'t1-t4-48-set-unified-recipe-review-v2.json');
const next=load(base+'t1-t4-48-set-unified-recipe-review-v3.json');
const auth=load(base+'eq2-expanded-48-set-member-authoring-v1.json');
const recipes=new Map(next.recipes.map(r=>[r.id,r]));
const templates=new Map(auth.members.map(m=>[m.id,m]));
assert.equal(prev.recipes.length,746);
assert.equal(recipes.size,746);
assert.equal(next.recipes.length,746);
assert.equal(templates.size,204);
assert.equal(auth.summary.newlyAuthoredDraftTemplates,130);
assert.equal(auth.summary.unapprovedExistingSourceCandidates,74);
assert.equal(next.summary.authorizedItems,0);
assert.equal(next.summary.authorizedRecipes,0);
assert.equal(next.summary.processingReferencesToExisting,1);
assert.equal(next.summary.proposedNewProcessingOutputs,15);
assert.equal(next.processingReview.length,16);
assert.equal(new Set(next.processingReview.map(p=>p.output)).size,16);
assert.deepEqual(auth.summary.byTier.map(t=>[t.count,t.missingAuthoringDrafts,t.candidateLinks]),
 [[51,33,18],[51,30,21],[51,31,20],[51,36,15]]);
for(const row of auth.members){
 assert.ok(row.id&&row.nameProposal&&row.id.includes('EQ2_LAUNCH_T'+row.tier+'_'));
 assert.equal(row.setId,'eq2_t'+row.tier+'_'+row.familyId);
 assert.equal(row.ownerApproval,'REQUIRED_BEFORE_REGISTRATION');
 assert.equal(row.artReviewed,false);
 assert.equal(row.equipmentRegistered,false);
 assert.equal(row.craftable,false);
 assert.equal(row.mayMint,false);
 assert.equal(row.combatReady,false);
 assert.equal(row.baseStatCount,row.baseStatsProfile.split('_').length);
 assert.ok(row.baseStatCount===1||row.baseStatCount===2);
 assert.ok(['smithing','tailoring'].includes(row.profession));
 assert.equal(row.recipeIds.length,2);
 for(const rid of row.recipeIds){
   const r=recipes.get(rid);
   assert.ok(r,'no recipe '+rid);
   assert.equal(r.group,'expanded_48_sets');
   for(const k of ['tier','setId','role','slot','profession'])
     assert.equal(r[k],row[k],k+' mismatch '+rid);
   assert.equal(r.reviewOnly,true);assert.equal(r.mayMint,false);
   assert.equal(r.craftable,false);assert.equal(r.craftCombatLevelRequired,0);
   assert.ok(r.professionLevel>0);
 }
 if(row.sourceCandidate){
   assert.equal(row.sourceResolution,'UNAPPROVED_EXACT_SOURCE_COMPATIBILITY');
   assert.equal(row.sourceCandidate.approved,false);
   assert.equal(row.sourceCandidate.mayOverwrite,false);
   assert.equal(row.sourceCandidate.originalSetId,null);
 }else assert.equal(row.sourceResolution,'NEW_DRAFT_TEMPLATE_AUTHORED');
}
const forbidden=new Set(['EQ2_COPPER_ORE','EQ2_IRON_ORE','WOLF_FANG',
  'EQ2_SUNSCALE_LEATHER','EQ2_HARDENED_SUNSCALE','SUNSCALE']);
const replacements=new Map([
 ['WOLF_FANG','IRONWOOD_FANG'],
 ['EQ2_SUNSCALE_LEATHER','EQ2_SUNSCAR_LEATHER'],
 ['EQ2_HARDENED_SUNSCALE','EQ2_HARDENED_SUNSCAR_LEATHER'],
]);
const baseById=new Map(prev.recipes.map(x=>[x.id,x]));
const oldById=new Map(prev.processingReview.map(x=>[x.output,x]));
const raw=next.resolution.sourceIds;
const processed=new Set(next.processingReview.map(p=>p.output));
const knownSrc=new Set([...Object.keys(raw),...processed]);
const tierCommon={1:'EQ2_BOAR_TUSK',2:'IRONWOOD_FANG',3:'EQ2_SUNSCAR_SCALE',4:'EQ2_GLASSBOUND_PLATE'};
const tierRare={1:'EQ2_VERDANT_ESSENCE',2:'EQ2_TROLL_SINEW',3:'EQ2_MIRAGEFANG_CORE',4:'EQ2_GLASSHEART_FRAGMENT'};
const tierBinder={1:'VERDANT_BINDING_RESIN',2:'IRONWOOD_BINDING_RESIN',3:'SUNSCAR_DUNE_BINDER',4:'GLASSBOUND_BINDER'};
let revisedInputs=0;
for(const r of next.recipes){
 const old=baseById.get(r.id);
 assert.ok(old,'new ID not in original review');
 assert.equal(r.pieceId,old.pieceId);
 assert.equal(r.tier,old.tier);
 assert.equal(r.route,old.route);
 assert.equal(r.profession,old.profession);
 for(const k of ['gold','xp','seconds','professionLevel','craftCombatLevelRequired',
                'equipCombatLevelCandidate','reviewOnly','craftable','mayMint'])
  assert.equal(r[k],old[k],'changed forbidden mechanic '+k+' '+r.id);
 assert.equal(r.inputs.length,old.inputs.length);
 for(let i=0;i<r.inputs.length;i++){
  const ingredient=r.inputs[i],before=old.inputs[i];
  assert.equal(ingredient.itemId,replacements.get(before.itemId)||before.itemId);
  assert.equal(ingredient.quantity,before.quantity);
  if(ingredient.itemId!==before.itemId)revisedInputs++;
  assert.ok(knownSrc.has(ingredient.itemId),
    'Unknown source requirement '+ingredient.itemId+' in '+r.id);
  assert.ok(!forbidden.has(ingredient.itemId),'unresolved material '+ingredient.itemId);
  assert.ok(ingredient.quantity>0&&Number.isInteger(ingredient.quantity));
 }
 assert.ok(r.inputs.some(x=>x.itemId===tierCommon[r.tier]),'missing combat common '+r.id);
 assert.ok(r.inputs.some(x=>x.itemId===tierBinder[r.tier]),'missing binder '+r.id);
 const scarce=r.inputs.find(x=>x.itemId===tierRare[r.tier]);
 const beforeScarce=old.inputs.find(x=>x.itemId===tierRare[r.tier]);
 assert.equal(scarce?.quantity||0,beforeScarce?.quantity||0,'scarce changed '+r.id);
}
assert.ok(revisedInputs>100,'expected actual material corrections');
const readOutput=name=>next.processingReview.find(p=>p.output===name);
const copper=readOutput('EQ2_COPPER_BAR');
assert.deepEqual(copper.inputs,{COPPER_ORE:3});
const iron=readOutput('EQ2_IRON_BAR');
assert.deepEqual(iron.inputs,{ASTER_IRON_ORE:3});
assert.deepEqual(readOutput('EQ2_SUNSCAR_LEATHER').inputs,{EQ2_SUNSCAR_HIDE:3});
assert.deepEqual(readOutput('EQ2_HARDENED_SUNSCAR_LEATHER').inputs,
 {EQ2_SUNSCAR_HIDE:4,EQ2_GLASSBOUND_DUST:1});
const ingot=readOutput('SUNSTONE_INGOT');
assert.equal(ingot.recipeId,'SMELT_SUNSTONE_INGOT');
assert.equal(ingot.authoringMode,'REFERENCE_ONLY_NO_DUPLICATE_PROCESSING');
assert.equal(ingot.quantity,3);assert.equal(ingot.xp,520);assert.equal(ingot.seconds,180);
assert.deepEqual(ingot.inputs,{SUNSTONE_ORE:6,DUNEWOOD:4});
assert.equal(next.processingReview.filter(p=>p.authoringMode!=='REFERENCE_ONLY_NO_DUPLICATE_PROCESSING').length,15);
for(const p of next.processingReview){
 assert.equal(p.reviewOnly,true);
 assert.equal(p.authoritative,false);
 assert.ok(!forbidden.has(p.output));
 for(const [itemId,qty] of Object.entries(p.inputs)){
   assert.ok(knownSrc.has(itemId),'unknown process raw '+itemId);
   assert.ok(!forbidden.has(itemId));
   assert.ok(Number.isInteger(qty)&&qty>0);
 }
}
for(const [id,entry] of Object.entries(raw)){
 assert.equal(entry.authorizedToMint,false);
 assert.equal(entry.sourceGrantVerified,false);
 if(entry.origin.includes('UNREGISTERED'))assert.ok(!entry.recipeId);
}
assert.ok(Object.keys(raw).filter(id=>raw[id].origin.includes('UNREGISTERED')).length>=14);
assert.deepEqual(raw.EQ2_SUNSCAR_HIDE.candidates,[],
 'No existing scorpion should be treated as a hide-bearing creature');
assert.ok(raw.EQ2_GLASSBOUND_DUST.origin.includes('GATHERING'),
 'Dust must have an independent profession-accessible source proposal');
assert.equal(next.resolution.tierSourceCandidates[2].proposedHideEnemies.length,0);
assert.ok(next.resolution.tierSourceCandidates[3].proposedDustGatheringRoute.includes('noncombat'));

const entries=next.resolution.tierSourceCandidates;
assert.deepEqual(entries.map(x=>x.tier),[1,2,3,4]);
for(const e of entries){
 assert.ok(e.proposedCommonEnemies.length>0);
 assert.ok(e.proposedRareEnemies.length>0);
 assert.ok(e.proposedCommonEnemies.every(x=>x.sourceProof===false));
 assert.ok(e.proposedRareEnemies.every(x=>x.sourceProof===false));
}
assert.equal(entries[0].proposedCommonEnemies[0].inspectedUnlockLevel,3);
assert.equal(entries[2].proposedRareEnemies[0].inspectedUnlockLevel,26);
assert.equal(entries[3].proposedRareEnemies[0].inspectedUnlockLevel,38);
console.log('PASS: 204 authored draft templates (130 new), 74 protected unapproved source matches, '+
 '746 v3 material-corrected review routes, explicit owned-source reuse, '+revisedInputs+
 ' recipe ingredient replacements, 15 new processing proposals + 1 canonical ingot pointer; zero live grants.');
