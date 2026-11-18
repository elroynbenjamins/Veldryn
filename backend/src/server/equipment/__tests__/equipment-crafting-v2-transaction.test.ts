import assert from 'node:assert/strict';
import {v2ServerRecipeAndPiece,V2_SERVER_PIECES,V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {assertEquipmentCraftingV2Released} from '../equipment-crafting-v2-gate';
import {resolveEquipmentV2DraftCommand,runEquipmentV2Command,V2DraftCraftError,
 type V2DraftContext,type V2DraftSnapshot} from '../equipment-crafting-v2-transaction';

assert.equal(V2_SERVER_PIECES.length,66,'Server only knows canonical 66 hidden item templates');
assert.equal(V2_SERVER_RECIPES.length,132,'Two canonical recipes per hidden item');
assert.equal(new Set(V2_SERVER_PIECES.map(x=>x.id)).size,66);
assert.equal(new Set(V2_SERVER_RECIPES.map(x=>x.id)).size,132);
for(const recipe of V2_SERVER_RECIPES){
 const source=v2ServerRecipeAndPiece(recipe.id);
 assert.ok(source,'All recipes must reference server-owned equipment');
 assert.equal(source.piece.tier,recipe.tier);
 assert.equal(source.recipe.pieceId,source.piece.id);
 assert.equal(recipe.gold%100,0,'Gold assembly values must be rounded to 100');
 assert.ok(recipe.inputs.length>=4&&recipe.inputs.every(i=>Number.isSafeInteger(i.quantity)&&i.quantity>0));
}
assert.throws(()=>assertEquipmentCraftingV2Released(),/not_released/,'Backend V2 gate must be disabled');
const recipe=V2_SERVER_RECIPES.find(r=>r.id==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
assert.ok(recipe);
let idIndex=0;
const makeContext=(nowMs:number):V2DraftContext=>({
 accountId:'account-test',characterId:'character-test',nowMs,
 randomId:()=>['job-1','instance-1','job-2','instance-2'][idIndex++]??'next-'+idIndex,
 randomInt:()=>0,
});
const create=():V2DraftSnapshot=>({
 accountId:'account-test',activeCharacterId:'character-test',version:10,
 characterLevel:30,professionLevels:{smithing:45,tailoring:45},
 gold:10000,
 inventory:Object.fromEntries(recipe.inputs.map(i=>[i.itemId,Math.ceil(i.quantity/2)])),
 bank:Object.fromEntries(recipe.inputs.map(i=>[i.itemId,Math.floor(i.quantity/2)])),
 jobs:[],equipment:[],skillAwards:[],receipts:[],
});
const original=create(),before=structuredClone(original);
const startRequest={kind:'start' as const,requestId:'start-000001',expectedVersion:10,recipeId:recipe.id};
const start=resolveEquipmentV2DraftCommand(original,startRequest,makeContext(1_000_000));
assert.deepEqual(original,before,'Planning must never mutate trusted state in place');
assert.equal(start.replayed,false);
assert.equal(start.response.kind,'started');
assert.equal(start.next.gold,10000-recipe.gold);
assert.equal(start.next.version,11);
assert.equal(start.next.jobs.length,1);
assert.equal(start.next.receipts.length,1);
assert.equal(start.next.equipment.length,0,'No rarity/quality item may exist at queue start');
assert.equal(start.next.jobs[0].goldReserved,recipe.gold);
assert.equal(start.next.jobs[0].materialsReserved.length,recipe.inputs.length);
for(const ingredient of recipe.inputs){
 assert.equal((start.next.inventory[ingredient.itemId]??0)+(start.next.bank[ingredient.itemId]??0),0,
  'Consume owned materials across Inventory and Bank at most once');
}
const replay=resolveEquipmentV2DraftCommand(start.next,startRequest,makeContext(1_000_000));
assert.equal(replay.replayed,true);
assert.deepEqual(replay.response,start.response);
assert.equal(replay.next,start.next,'Request replay is read-only and does not change balances');
assert.throws(()=>resolveEquipmentV2DraftCommand(start.next,
 {...startRequest,recipeId:recipe.id.replace('FOUNDATION','ALTERNATE')},makeContext(1_000_000)),
 /request_id_conflict/);
assert.throws(()=>resolveEquipmentV2DraftCommand(start.next,
 {kind:'start',requestId:'start-000002',expectedVersion:10,recipeId:recipe.id},
 makeContext(1_000_000)),/stale_game_version/);
assert.throws(()=>resolveEquipmentV2DraftCommand(start.next,
 {kind:'start',requestId:'start-000002',expectedVersion:11,recipeId:'T1P_001'},
 makeContext(1_000_000)),/unknown_v2_recipe/,'Legacy item IDs may never be crafted through V2');
assert.throws(()=>resolveEquipmentV2DraftCommand(start.next,
 {kind:'start',requestId:'start-000002',expectedVersion:11,recipeId:recipe.id,gold:0} as never,
 makeContext(1_000_000)),/invalid_command_fields/,'Forged Gold input must be rejected');
const job=start.next.jobs[0];
assert.throws(()=>resolveEquipmentV2DraftCommand(start.next,
 {kind:'claim',requestId:'claim-00001',expectedVersion:11,jobId:job.id},
 makeContext(job.finishesAtMs-1)),/job_not_finished/,'Premature claim must not roll an item');
const claimRequest={kind:'claim' as const,requestId:'claim-00001',expectedVersion:11,jobId:job.id};
const claim=resolveEquipmentV2DraftCommand(start.next,claimRequest,makeContext(job.finishesAtMs));
assert.equal(claim.response.kind,'claimed');
assert.equal(claim.next.equipment.length,1);
assert.equal(claim.next.skillAwards.length,1);
assert.equal(claim.next.gold,start.next.gold);
assert.equal(claim.next.version,12);
assert.equal(claim.next.jobs[0].status,'claimed');
assert.equal(claim.next.skillAwards[0].xp,recipe.xp);
assert.equal(claim.next.equipment[0].outcome.rarity,'mythic');
assert.equal(claim.next.equipment[0].outcome.quality,0);
assert.equal(claim.next.equipment[0].outcome.affixes.length,2,'T1 Mythic has two affixes');
assert.equal(new Set(claim.next.equipment[0].outcome.affixes.map(a=>a.stat)).size,2);
const claimReplay=resolveEquipmentV2DraftCommand(claim.next,claimRequest,makeContext(job.finishesAtMs+999));
assert.equal(claimReplay.replayed,true);
assert.deepEqual(claimReplay.response,claim.response);
assert.equal(claimReplay.next.equipment.length,1,'Replay must never mint a second piece');
assert.throws(()=>resolveEquipmentV2DraftCommand(claim.next,
 {kind:'claim',requestId:'claim-00002',expectedVersion:12,jobId:job.id},
 makeContext(job.finishesAtMs+999)),/already_claimed/,'A distinct claim request cannot mint again');
const noGold=create();noGold.gold=recipe.gold-1;
assert.throws(()=>resolveEquipmentV2DraftCommand(noGold,startRequest,makeContext(1_000_000)),/insufficient_gold/);
const noMaterial=create();noMaterial.bank[recipe.inputs[0].itemId]=0;
assert.throws(()=>resolveEquipmentV2DraftCommand(noMaterial,startRequest,makeContext(1_000_000)),/insufficient_materials/);
const noLevel=create();noLevel.professionLevels.smithing=0;
assert.throws(()=>resolveEquipmentV2DraftCommand(noLevel,startRequest,makeContext(1_000_000)),/craft_requirement_locked/);
const wrongOwner=create();
assert.throws(()=>resolveEquipmentV2DraftCommand(wrongOwner,startRequest,
 {...makeContext(1_000_000),accountId:'attacker'}),/invalid_owner/);
assert.throws(()=>runEquipmentV2Command({withAccountTransaction:async()=>{throw Error('must not run')}} as never,
 makeContext(1_000_000),startRequest),/not_released/,'No hidden V2 write adapter may execute');

// Distinct completed jobs must not block new queue positions: 20 ready jobs
// can remain unclaimed independently of the 3 active + 5 waiting limit.
const readyState=create();
readyState.jobs=Array.from({length:8},(_,i)=>({
 id:'ready-'+i,accountId:readyState.accountId,ownerCharacterId:readyState.activeCharacterId,
 recipeId:recipe.id,pieceId:recipe.pieceId,startedAtMs:1,finishesAtMs:2,slotIndex:(i%3) as 0|1|2,
 goldReserved:recipe.gold,materialsReserved:[],status:'queued' as const,
}));
const readyStart=resolveEquipmentV2DraftCommand(readyState,startRequest,makeContext(1_000_000));
assert.equal(readyStart.next.jobs.length,9,'Finished unclaimed jobs do not exhaust the in-flight queue');
assert.equal(readyStart.next.jobs[8].startedAtMs,1_000_000);
console.log('PASS: hidden V2 craft canonical recipes, Gold/material reservations, capacity, idempotency, replay and exact one-time claims');
