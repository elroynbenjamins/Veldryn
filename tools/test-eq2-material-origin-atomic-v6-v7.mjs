#!/usr/bin/env node
/** Hidden EQ2 V6/V7 contracts: all 29 sources, 746 draft routes, no writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root='../backend/dist-equipment-combat-v2-launch/server/equipment/';
const v6=require(root+'equipment-crafting-v2-material-origins-v6-review.js');
const v7=require(root+'equipment-crafting-v2-atomic-handoff-v7-review.js');
const v5=require(root+'equipment-crafting-v2-stackable-material-boundary-review.js');
const v4=require(root+'equipment-crafting-v2-material-source-review.js');
const source=JSON.parse(fs.readFileSync(
 'docs/equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json','utf8'));
assert.equal(v6.EQ2_V6_SOURCE_GRANTS_ENABLED,false);
assert.equal(v6.EQ2_V6_PROCESSING_ENABLED,false);
assert.equal(v7.EQ2_V7_ATOMIC_CRAFT_ENABLED,false);
assert.equal(v6.EQ2_V6_DRAFT_PROCESSES.length,15);
assert.equal(v5.EQ2_REVIEW_MATERIAL_IDENTITIES.length,29);
const newProcesses=source.processingReview.filter(x=>
 x.authoringMode==='NEW_PROCESSED_OUTPUT_UNREGISTERED');
const outputIds=new Set();
for(const row of newProcesses){
 const proposed=v6.eq2V6ProcessDraft(row.output);
 assert.ok(proposed,row.output);
 assert.ok(!outputIds.has(row.output));outputIds.add(row.output);
 for(const key of ['tier','quantity','activity','xp','seconds','xpSkill'])
  assert.equal(proposed[key],row[key],row.output+':'+key);
 assert.deepEqual(proposed.inputs,row.inputs);
 assert.equal(proposed.canonicalRegistration,false);
 assert.equal(proposed.mayProcess,false);
 const result=v6.reviewEq2V6MaterialOrigin({
  itemId:row.output,sourceKind:'processing',
  sourceId:'PROCESS:'+row.output,quantity:1,
  originReceiptId:'receipt:process:001',clientClaimsVerified:true,
 });
 assert.equal(result.reason,'unregistered_processing');
 assert.equal(result.canGrant,false);
}
assert.equal(outputIds.size,15);
assert.equal(v6.eq2V6ProcessDraft('SUNSTONE_INGOT'),undefined);
assert.equal(source.processingReview.filter(x=>x.output==='SUNSTONE_INGOT').length,1);
const coverage=v6.auditEq2V6SourceCoverage();
assert.equal(coverage.rawCandidates,14);
assert.equal(coverage.processingCandidates,15);
assert.equal(coverage.withoutRegisteredSource.length,14);
assert.equal(coverage.sourceAndProcessReady,false);
for(const row of v4.EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS){
 const kind=row.kind==='gathering'?'gathering':'monster';
 const candidate=row.candidateMonsterIds[0];
 const claim={itemId:row.itemId,sourceKind:kind,
  sourceId:kind==='monster'&&candidate?'MONSTER:'+candidate:'NODE:UNREGISTERED',
  quantity:1,originReceiptId:'receipt:source:001',
  clientClaimsVerified:true};
 const result=v6.reviewEq2V6MaterialOrigin(claim);
 assert.equal(result.canGrant,false);
 assert.equal(result.sourceVerified,false);
 assert.equal(result.proposalKnown,true);
 assert.notEqual(result.reason,'invalid_proof');
}
assert.ok(coverage.missingSource.includes('EQ2_SUNSCAR_HIDE'));
assert.ok(coverage.missingSource.includes('EQ2_GLASSBOUND_DUST'));
assert.equal(v6.reviewEq2V6MaterialOrigin({
 itemId:'EQ2_SUNSCAR_HIDE',sourceKind:'monster',
 sourceId:'MONSTER:SUNSCAR_SCORPION',quantity:1,
 originReceiptId:'receipt:invented:001',
}).canGrant,false);
assert.equal(v6.reviewEq2V6MaterialOrigin({
 itemId:'EQ2_GLASSBOUND_DUST',sourceKind:'gathering',
 sourceId:'NODE:UNREGISTERED',quantity:1,originReceiptId:'receipt:dust:001',
}).reason,'missing_registered_source');
assert.equal(v6.reviewEq2V6MaterialOrigin({
 itemId:'EQ2_LAUNCH_FAKE_GEAR',sourceKind:'processing',
 sourceId:'PROCESS:EQ2_LAUNCH_FAKE_GEAR',quantity:1,
 originReceiptId:'receipt:forged:001',
}).reason,'unknown_material');

assert.equal(source.recipes.length,746);
for(const recipe of source.recipes){
 assert.ok(recipe.inputs.some(i=>i.itemId.startsWith('EQ2_')),recipe.id);
 for(const input of recipe.inputs.filter(x=>x.itemId.startsWith('EQ2_')))
  assert.ok(v5.eq2ReviewMaterialIdentity(input.itemId),recipe.id);
}
const recipe=source.recipes[0];
const catalog=source.recipes;
const request={requestId:'eq2_v7_request_0001',accountId:'account_1',
 characterId:'char_1',recipeId:recipe.id,expectedRevision:8};
function data(){
 const inventory=Object.fromEntries(recipe.inputs.map(x=>[x.itemId,x.quantity]));
 const snapshot={accountId:'account_1',authenticatedCharacterId:'char_1',
  revision:8,characters:{
   char_1:{professionLevels:{smithing:99,tailoring:99},
    walletGold:recipe.gold,inventory},
   char_2:{professionLevels:{smithing:1,tailoring:1},
    walletGold:0,inventory:{}},
  },bank:{},receipts:[]};
 const lots=recipe.inputs.filter(x=>x.itemId.startsWith('EQ2_'))
  .map((input,i)=>{
   const src=v4.eq2RequiredMaterialSourceDraft(input.itemId);
   const isProcess=!src;
   const kind=isProcess?'processing':src.kind==='gathering'?'gathering':'monster';
   const sourceId=isProcess?'PROCESS:'+input.itemId:
    kind==='monster'?'MONSTER:'+(src.candidateMonsterIds[0]??'UNREGISTERED'):
    'NODE:UNREGISTERED';
   return {lotId:'lot_'+i,accountId:'account_1',materialId:input.itemId,
    quantity:input.quantity,receiptTotalQuantity:input.quantity,
    originReceiptId:'original_receipt_'+i,originKind:kind,sourceId,
    location:'inventory',characterId:'char_1'};
  });
 const queue={activeSlotsUsed:1,activeSlotsCapacity:3,waitingJobs:0,
  readyJobs:0,currentlyOwnedCopiesOfOutput:0,pendingRequestIds:[]};
 return {snapshot,lots,queue};
}
const d=data();
const preview=v7.previewEq2V7AtomicCraftHandoff(
 request,d.snapshot,catalog,d.lots,d.queue);
assert.equal(preview.canCommit,false);
assert.equal(preview.releaseEnabled,false);
assert.equal(preview.canMintOrGrantXp,false);
assert.equal(preview.canDebitGoldOrMaterials,false);
assert.equal(preview.originReceiptsIndependentlyVerified,false);
assert.equal(preview.reservation.replay,false);
assert.equal(preview.reservation.goldDebit,recipe.gold);
assert.equal(preview.proposedNextRevision,9);
assert.equal(preview.pendingOriginReceipts,d.lots.length);
assert.deepEqual(d.snapshot,data().snapshot,'preview mutated source state');
function rejects(transform,code){
 const t=data();transform(t);
 assert.throws(()=>v7.previewEq2V7AtomicCraftHandoff(
  request,t.snapshot,catalog,t.lots,t.queue),
  error=>error?.code===code,code);
}
rejects(t=>{t.lots.push({...t.lots[0],lotId:'extra_lot',quantity:1});},
 'source_receipt_overclaimed');
rejects(t=>{t.lots[0].accountId='other_account';},'forged_or_duplicate_lot');
rejects(t=>{t.lots[0].characterId='char_2';},'incomplete_material_lot_coverage');
rejects(t=>{t.lots.push({...t.lots[0]});},'forged_or_duplicate_lot');
rejects(t=>{t.lots[0].materialId='EQ2_FAKE_COPY';},'forged_or_duplicate_lot');
rejects(t=>{t.lots[0].originReceiptId=t.lots[1].originReceiptId;},
 'source_receipt_reused_for_other_material');
rejects(t=>{t.snapshot.characters.char_2.inventory.EQ2_FAKE_COPY=1;},
 'unknown_eq2_identity_in_storage');
rejects(t=>{t.queue.activeSlotsUsed=3;},'forge_capacity_full');
rejects(t=>{t.queue.currentlyOwnedCopiesOfOutput=25;},
 'piece_copy_limit_reached');
rejects(t=>{t.queue.pendingRequestIds=[request.requestId];},
 'queue_request_id_conflict');
rejects(t=>{t.snapshot.revision=9;},'reservation_stale_account_revision');
rejects(t=>{t.snapshot.characters.char_1.walletGold=0;},
 'reservation_insufficient_gold');
rejects(t=>{t.snapshot.characters.char_1.professionLevels.smithing=0;},
 'reservation_profession_level_locked');
rejects(t=>{t.snapshot.characters.char_1.inventory.EQ2_WEAPON_COPY=1;},
 'unknown_eq2_identity_in_storage');
const bankCase=data();
const transferred=bankCase.lots[0];
delete bankCase.snapshot.characters.char_1.inventory[transferred.materialId];
bankCase.snapshot.bank[transferred.materialId]=transferred.quantity;
transferred.location='bank';delete transferred.characterId;
transferred.bankDepositReceiptId='bank_deposit_receipt_001';
assert.equal(v7.previewEq2V7AtomicCraftHandoff(
 request,bankCase.snapshot,catalog,bankCase.lots,bankCase.queue)
 .canUpdateBankOrQueue,false);
assert.throws(()=>{
 delete transferred.bankDepositReceiptId;
 v7.previewEq2V7AtomicCraftHandoff(
  request,bankCase.snapshot,catalog,bankCase.lots,bankCase.queue);
},e=>e?.code==='missing_or_replayed_bank_deposit');
const replay=data();
replay.snapshot.receipts.push({
 requestId:request.requestId,accountId:request.accountId,
 characterId:request.characterId,recipeId:request.recipeId,sourceRevision:8,
});
const replayPlan=v7.previewEq2V7AtomicCraftHandoff(
 request,replay.snapshot,catalog,replay.lots,replay.queue);
assert.equal(replayPlan.reservation.replay,true);
assert.equal(replayPlan.reservation.goldDebit,0);
assert.equal(replayPlan.reservation.wouldAwardXp,0);
assert.equal(replayPlan.proposedNextRevision,8);
console.log('PASS: V6 14 raw + 15 exact proposed transforms and 746 fail-closed routes; V7 preview source-lot/queue/Bank/replay/ownership adversarial cases; no commits or grants.');
