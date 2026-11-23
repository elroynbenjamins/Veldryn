#!/usr/bin/env node
/**
 * Hidden Equipment/Crafting 2.0: test compiled server-only pure source
 * and account reservation contracts against all 746 v3 review routes.
 * No item creation, public route, SQL, inventory write or production calls.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root='../backend/dist-equipment-combat-v2-launch/server/equipment/';
const sources=require(root+'equipment-crafting-v2-material-source-review.js');
const atomic=require(root+'equipment-crafting-v2-unified-reservation-review.js');
const v3=JSON.parse(fs.readFileSync('docs/equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json','utf8'));
const authored=JSON.parse(fs.readFileSync('docs/equipment-2-0/eq2-expanded-48-set-member-authoring-v1.json','utf8'));
const raw=v3.resolution.sourceIds;
const required=new Set(v3.recipes.flatMap(r=>r.inputs.map(x=>x.itemId)));
for(const p of v3.processingReview)for(const id of Object.keys(p.inputs))required.add(id);
const requiredUnregistered=Object.entries(raw).filter(([id,v])=>required.has(id)&&v.origin.includes('UNREGISTERED')).map(([id])=>id).sort();
const proposed=sources.EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS;
assert.equal(sources.EQ2_REVIEW_SOURCE_GRANTS_ENABLED,false);
assert.equal(proposed.length,14);
assert.deepEqual(proposed.map(x=>x.itemId).sort(),requiredUnregistered);
for(const row of proposed){
 assert.equal(row.grantVerified,false);
 assert.equal(row.isRegistered,false);
 assert.equal(row.mintAuthorized,false);
 assert.equal(row.releaseEnabled,false);
 assert.equal(row.proposedTradeable,true);
 assert.ok(row.note.length>12);
 assert.ok([1,2,3,4].includes(row.tier));
 assert.equal(sources.eq2RequiredMaterialSourceDraft(row.itemId)?.itemId,row.itemId);
 const attempt=sources.preflightEq2MaterialGrant({
   itemId:row.itemId,sourceId:'MONSTER:'+(row.candidateMonsterIds[0]??'FAKE'),
   quantity:1,claimedVerified:true,
 });
 assert.equal(attempt.canGrant,false);
 assert.ok(['source_mismatch','draft_not_registered'].includes(attempt.reason));
 assert.equal(sources.preflightEq2MaterialGrant({
   itemId:row.itemId,sourceId:'MONSTER:'+(row.candidateMonsterIds[0]??'FAKE'),
   quantity:0,claimedVerified:true,
 }).reason,'invalid_quantity');
 assert.equal(sources.preflightEq2MaterialGrant({
   itemId:row.itemId,sourceId:'MONSTER:ROBOT_FROM_NOWHERE',
   quantity:1,claimedVerified:true,
 }).canGrant,false);
}
assert.equal(sources.preflightEq2MaterialGrant({
 itemId:'SUNSTONE_INGOT',sourceId:'MONSTER:IRONWOOD_WOLF',
 quantity:4,claimedVerified:true,
}).reason,'source_unknown');
assert.equal(sources.eq2RequiredMaterialSourceDraft('EQ2_SUNSCAR_HIDE').candidateMonsterIds.length,0);
assert.ok(sources.eq2RequiredMaterialSourceDraft('EQ2_GLASSBOUND_DUST').candidateGatheringKind);
const catalog=v3.recipes;
assert.equal(catalog.length,746);
function snapshotFor(recipe){
 const pack=Object.fromEntries(recipe.inputs.map((m,i)=>[m.itemId,
   i%2===0?m.quantity:Math.floor(m.quantity/2)]));
 const bank=Object.fromEntries(recipe.inputs.map((m,i)=>[m.itemId,
   i%2===0?0:m.quantity-Math.floor(m.quantity/2)]));
 return {
  accountId:'account-v4',authenticatedCharacterId:'hero-crafter',
  revision:8,
  characters:{
   'hero-crafter':{professionLevels:{smithing:100,tailoring:100},walletGold:1_000_000,inventory:pack},
   'other-character':{professionLevels:{smithing:2,tailoring:2},walletGold:5,inventory:{}},
  },bank,receipts:[],
 };
}
const makeRequest=recipe=>({requestId:'craft-v4-0001',recipeId:recipe.id,
 accountId:'account-v4',characterId:'hero-crafter',expectedRevision:8});
let count=0,acrossBank=0;
for(const recipe of catalog){
 const state=snapshotFor(recipe),request=makeRequest(recipe);
 const frozen=JSON.stringify(state),plan=atomic.previewEq2ReviewedReservation(request,state,catalog);
 assert.equal(JSON.stringify(state),frozen,'planner may not mutate bank or pack');
 assert.equal(plan.allowedToCommit,false);
 assert.equal(plan.requiresAuthenticatedAtomicDbAdapter,true);
 assert.equal(plan.replay,false);
 assert.equal(plan.goldDebit,recipe.gold);
 assert.equal(plan.wouldAwardXp,recipe.xp);
 assert.equal(plan.revision,8);
 assert.equal(plan.debits.length,recipe.inputs.length);
 assert.equal(plan.reason,'REVIEW_ONLY_NO_MINT_OR_PERSISTENCE');
 for(const debit of plan.debits){
  const canonical=recipe.inputs.find(x=>x.itemId===debit.itemId);
  assert.equal(debit.quantity,canonical.quantity);
  assert.equal(debit.fromCharacter+debit.fromBank,debit.quantity);
  if(debit.fromBank>0)acrossBank++;
 }
 // Even a character with *zero combat level* is not excluded by the
 // preview: profession progression and owned materials are the requirements.
 assert.equal(recipe.craftCombatLevelRequired,0);
 count++;
}
assert.equal(count,746);
assert.ok(acrossBank>500,'the review must demonstrate shared Bank reservations');
// Adversarial tests on the source-owned full 746-recipe catalog.
const first=catalog.find(x=>x.pieceId==='EQ2_LAUNCH_T1_OATHPLATE_HELMET'&&x.route==='foundation');
assert.ok(first);
const base=snapshotFor(first),req=makeRequest(first);
const rejection=(state,request,cat,pattern)=>{
 assert.throws(()=>atomic.previewEq2ReviewedReservation(request,state,cat),pattern);
};
rejection({...base,accountId:'foreign-owner'},req,catalog,/invalid_authenticated_snapshot_or_request/);
rejection({...base,authenticatedCharacterId:'other-character'},req,catalog,/invalid_authenticated_snapshot_or_request/);
rejection(base,{...req,characterId:'other-character'},catalog,/invalid_authenticated_snapshot_or_request/);
rejection(base,{...req,expectedRevision:7},catalog,/stale_account_revision/);
rejection({...base,characters:{...base.characters,'hero-crafter':{
 ...base.characters['hero-crafter'],walletGold:first.gold-1,
}}},req,catalog,/insufficient_gold/);
rejection({...base,characters:{...base.characters,'hero-crafter':{
 ...base.characters['hero-crafter'],professionLevels:{smithing:0,tailoring:100},
}}},req,catalog,/profession_level_locked/);
rejection({...base,bank:{...base.bank,[first.inputs[0].itemId]:-1}},req,catalog,/invalid_material_storage/);
rejection({...base,bank:{...base.bank,[first.inputs[0].itemId]:Number.MAX_SAFE_INTEGER+1}},req,catalog,/invalid_material_storage/);
const missing=structuredClone(base);
missing.characters['hero-crafter'].inventory[first.inputs[0].itemId]=0;
missing.bank[first.inputs[0].itemId]=0;
rejection(missing,req,catalog,/insufficient_owned_materials/);
const forged=structuredClone(catalog);
const idx=forged.findIndex(x=>x.id===first.id);
forged[idx].inputs=forged[idx].inputs.map((x,i)=>i===3?{...x,quantity:x.quantity-1}:x);
rejection(base,req,forged,/cross_route_combat_binder_bypass/);
const wrong=structuredClone(catalog);
wrong[idx].craftable=true;
rejection(base,req,wrong,/invalid_review_recipe/);
const duplicate=[...catalog,first];
rejection(base,req,duplicate,/unknown_or_duplicate_review_recipe/);
const poison=structuredClone(base);
Object.defineProperty(poison.characters['hero-crafter'].inventory,'__proto__',{value:2,enumerable:true});
rejection(poison,req,catalog,/invalid_material_storage/);
const receipt={requestId:req.requestId,accountId:req.accountId,
 characterId:req.characterId,recipeId:req.recipeId,sourceRevision:8};
const replay=atomic.previewEq2ReviewedReservation(req,{...base,revision:9,receipts:[receipt]},catalog);
assert.equal(replay.replay,true);
assert.equal(replay.allowedToCommit,false);
assert.equal(replay.goldDebit,0);
assert.deepEqual(replay.debits,[]);
rejection({...base,revision:9,receipts:[receipt]},
 {...req,recipeId:'OTHER_RECIPE'},catalog,/unknown_or_duplicate_review_recipe/);
rejection({...base,revision:9,receipts:[receipt]},
 {...req,recipeId:first.id.replace('FOUNDATION','ALTERNATE')},catalog,/request_id_conflict/);
rejection({...base,receipts:[receipt,receipt]},req,catalog,/duplicate_reserved_receipt/);
assert.equal(authored.members.length,204);
assert.equal(v3.summary.authorizedItems,0);
assert.equal(v3.summary.authorizedRecipes,0);
console.log('PASS: 14 required unregistered materials fail closed; 746 source-owned '+
 'nonexecutable craft reservation previews; '+acrossBank+' Bank splits, '+
 'cross-account/version/receipt/material/rare-route negative tests; no player writes.');
