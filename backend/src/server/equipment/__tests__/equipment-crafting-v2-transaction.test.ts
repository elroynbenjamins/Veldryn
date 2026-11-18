import assert from 'node:assert/strict';
import {v2ServerRecipeAndPiece,V2_SERVER_PIECES,V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {V2_SERVER_MANIFEST_VERSION} from '../equipment-crafting-v2-manifest';
import {v2ServerWeightedBaseBudget,V2_SERVER_SLOT_BUDGET} from '../equipment-crafting-v2-instances';
import {assertEquipmentCraftingV2Released} from '../equipment-crafting-v2-gate';
import {resolveEquipmentV2DraftCommand,runEquipmentV2Command,V2DraftCraftError,
 type V2DraftContext,type V2DraftSnapshot} from '../equipment-crafting-v2-transaction';

assert.equal(V2_SERVER_PIECES.length,118,'Server only knows canonical 118 hidden item templates');
assert.equal(V2_SERVER_RECIPES.length,236,'Two canonical recipes per hidden item');
assert.equal(new Set(V2_SERVER_PIECES.map(x=>x.id)).size,118);
assert.equal(new Set(V2_SERVER_RECIPES.map(x=>x.id)).size,236);
for(const recipe of V2_SERVER_RECIPES){
 const source=v2ServerRecipeAndPiece(recipe.id);
 assert.ok(source,'All recipes must reference server-owned equipment');
 assert.equal(source.piece.tier,recipe.tier);
 assert.equal(source.recipe.pieceId,source.piece.id);
 assert.equal(recipe.gold%100,0,'Gold assembly values must be rounded to 100');
 assert.ok(recipe.inputs.length>=4&&recipe.inputs.every(i=>Number.isSafeInteger(i.quantity)&&i.quantity>0));
 if(recipe.pieceId.startsWith('EQ2_WEAPON_')||recipe.pieceId.startsWith('EQ2_OFFHAND_')){
  assert.ok(source.piece.classRestriction,'Server must enforce an explicit wearable class on V2 armaments');
  if(source.piece.slot==='weapon')
   assert.ok(['one','two','dual'].includes(source.piece.hands??''),'Weapon must define its hand use');
  else assert.equal(source.piece.hands,undefined,'Offhands are not weapons with hand-count metadata');
 }
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
 accountId:'account-test',activeCharacterId:'character-test',version:10,forgeSlotCapacity:3,
 characters:{
  'character-test':{
   level:30,professionLevels:{smithing:45,tailoring:45},gold:10000,
   inventory:Object.fromEntries(recipe.inputs.map(i=>[i.itemId,Math.ceil(i.quantity/2)])),
  },
  'character-alt':{
   level:30,professionLevels:{smithing:45,tailoring:45},gold:7777,
   inventory:Object.fromEntries(recipe.inputs.map(i=>[i.itemId,0])),
  },
 },
 bank:Object.fromEntries(recipe.inputs.map(i=>[i.itemId,Math.floor(i.quantity/2)])),
 jobs:[],equipment:[],skillAwards:[],receipts:[],
});
const original=create(),before=structuredClone(original);
const startRequest={kind:'start' as const,requestId:'start-000001',expectedVersion:10,recipeId:recipe.id};
const start=resolveEquipmentV2DraftCommand(original,startRequest,makeContext(1_000_000));
assert.deepEqual(original,before,'Planning must never mutate trusted state in place');
assert.equal(start.replayed,false);
assert.equal(start.response.kind,'started');
assert.equal(start.next.characters['character-test'].gold,10000-recipe.gold);
assert.equal(start.next.version,11);
assert.equal(start.next.jobs.length,1);
assert.equal(start.next.characters['character-alt'].gold,7777,'An unrelated character wallet is never charged');
assert.equal(start.next.receipts.length,1);
assert.equal(start.next.equipment.length,0,'No rarity/quality item may exist at queue start');
assert.equal(start.next.jobs[0].goldReserved,recipe.gold);
assert.equal(start.next.jobs[0].craftContract.manifestVersion,V2_SERVER_MANIFEST_VERSION);
assert.equal(start.next.jobs[0].craftContract.xpAwarded,recipe.xp);
assert.equal(start.next.jobs[0].materialsReserved.length,recipe.inputs.length);
for(const ingredient of recipe.inputs){
 assert.equal((start.next.characters['character-test'].inventory[ingredient.itemId]??0)+(start.next.bank[ingredient.itemId]??0),0,
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
const switched=structuredClone(start.next);
switched.activeCharacterId='character-alt';
const otherCharacterContext={...makeContext(job.finishesAtMs),characterId:'character-alt'};
const claim=resolveEquipmentV2DraftCommand(switched,claimRequest,otherCharacterContext);
assert.equal(claim.response.kind,'claimed');
assert.equal(claim.next.equipment.length,1);
assert.deepEqual(claim.next.equipment[0].exactItem,claim.response.kind==='claimed'?claim.response.exactItem:null,
 'Claim receipt and persisted gear must contain the identical exact stat/affix snapshot');
assert.equal(claim.next.equipment[0].exactItem.quality,claim.next.equipment[0].outcome.quality);
assert.equal(claim.next.equipment[0].exactItem.rarity,claim.next.equipment[0].outcome.rarity);
assert.equal(claim.next.equipment[0].exactItem.gemSlots.length,0,'New gear starts unsocketed');
assert.equal(claim.next.equipment[0].exactItem.enhancementRank,0,'New gear starts unenhanced');
assert.ok(Math.abs(v2ServerWeightedBaseBudget(claim.next.equipment[0].exactItem.baseStats)
 -V2_SERVER_SLOT_BUDGET.helmet*1.08*1*.75*1.85)<.005,
 'Exact stat budget must reflect tier, slot, Q0 and Mythic rarity');
assert.equal(claim.next.equipment[0].ownerCharacterId,'character-test',
 'Claiming on a second character must not transfer the first character\'s item');
assert.equal(claim.next.skillAwards[0].characterId,'character-test',
 'Crafting XP must stay with the character who started the job');
assert.equal(claim.next.skillAwards.length,1);
assert.equal(claim.next.characters['character-test'].gold,start.next.characters['character-test'].gold);
assert.equal(claim.next.characters['character-alt'].gold,7777,'Claiming on alternate character never changes their wallet');
assert.equal(claim.next.version,12);
assert.equal(claim.next.jobs[0].status,'claimed');
assert.equal(claim.next.skillAwards[0].xp,recipe.xp);
assert.equal(claim.next.equipment[0].outcome.rarity,'mythic');
assert.equal(claim.next.equipment[0].outcome.quality,0);
assert.equal(claim.next.equipment[0].outcome.affixes.length,2,'T1 Mythic has two affixes');
assert.equal(new Set(claim.next.equipment[0].outcome.affixes.map(a=>a.stat)).size,2);
const claimReplay=resolveEquipmentV2DraftCommand(claim.next,claimRequest,{...makeContext(job.finishesAtMs+999),characterId:'character-alt'});
assert.equal(claimReplay.replayed,true);
assert.deepEqual(claimReplay.response,claim.response);
assert.equal(claimReplay.next.equipment.length,1,'Replay must never mint a second piece');
assert.throws(()=>resolveEquipmentV2DraftCommand(claim.next,
 {kind:'claim',requestId:'claim-00002',expectedVersion:12,jobId:job.id},
 {...makeContext(job.finishesAtMs+999),characterId:'character-alt'}),/already_claimed/,'A distinct claim request cannot mint again');

const atCap=structuredClone(start.next);
atCap.equipment=Array.from({length:25},(_,i)=>({
 id:'old-copy-'+i,accountId:atCap.accountId,ownerCharacterId:'character-test',
 createdAtMs:1,jobId:'old-job-'+i,outcome:claim.next.equipment[0].outcome,
 exactItem:claim.next.equipment[0].exactItem,
}));
assert.throws(()=>resolveEquipmentV2DraftCommand(atCap,claimRequest,makeContext(job.finishesAtMs)),
 /copy_limit_reached/,'Full exact-copy equipment storage cannot mint or auto-sell a 26th piece');
assert.equal(atCap.jobs[0].status,'queued','Blocked claim must preserve finished Forge job');
const drift=structuredClone(start.next);
drift.jobs[0].craftContract.xpAwarded++;
assert.throws(()=>resolveEquipmentV2DraftCommand(drift,claimRequest,makeContext(job.finishesAtMs)),
 /v2_queued_contract_version_mismatch/,
 'Craft receipt cannot be silently repriced or award a different XP amount after start');
assert.equal(drift.jobs[0].status,'queued','A drifted contract cannot be claimed or discarded');
const driftPiece=structuredClone(start.next);
driftPiece.jobs[0].craftContract.piece.profile='attack';
assert.throws(()=>resolveEquipmentV2DraftCommand(driftPiece,claimRequest,makeContext(job.finishesAtMs)),
 /v2_queued_contract_version_mismatch/,
 'Changing a queued item profile must not alter the final outcome');

const noGold=create();noGold.characters['character-test'].gold=recipe.gold-1;
assert.throws(()=>resolveEquipmentV2DraftCommand(noGold,startRequest,makeContext(1_000_000)),/insufficient_gold/);
const noMaterial=create();noMaterial.bank[recipe.inputs[0].itemId]=0;
assert.throws(()=>resolveEquipmentV2DraftCommand(noMaterial,startRequest,makeContext(1_000_000)),/insufficient_materials/);
const noLevel=create();noLevel.characters['character-test'].professionLevels.smithing=0;
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
 craftContract:structuredClone(start.next.jobs[0].craftContract),
}));
const readyStart=resolveEquipmentV2DraftCommand(readyState,startRequest,makeContext(1_000_000));
assert.equal(readyStart.next.jobs.length,9,'Finished unclaimed jobs do not exhaust the in-flight queue');
assert.equal(readyStart.next.jobs[8].startedAtMs,1_000_000);

const earnedSlots=create();
earnedSlots.forgeSlotCapacity=7;
earnedSlots.jobs=Array.from({length:11},(_,i)=>({
 ...structuredClone(start.next.jobs[0]),id:'earned-'+i,slotIndex:i%7,
 startedAtMs:1_000_000,finishesAtMs:2_000_000+i,
}));
const another=resolveEquipmentV2DraftCommand(earnedSlots,startRequest,makeContext(1_000_000));
assert.equal(another.next.jobs.length,12,
 'Seven earned Forge lanes plus five waiting crafts allow twelve scheduled jobs');
assert.ok(another.next.jobs[11].slotIndex>=0&&another.next.jobs[11].slotIndex<7,
 'New jobs choose a currently earned Forge lane');
const fullyScheduled=structuredClone(earnedSlots);
fullyScheduled.jobs.push({...structuredClone(start.next.jobs[0]),id:'earned-11',slotIndex:4,
 startedAtMs:1_000_000,finishesAtMs:3_000_000});
assert.throws(()=>resolveEquipmentV2DraftCommand(fullyScheduled,startRequest,makeContext(1_000_000)),
 /queue_full/,'Forge must honor the five-job waiting cap even at seven slots');
const badForgeCapacity=create();
badForgeCapacity.forgeSlotCapacity=8;
assert.throws(()=>resolveEquipmentV2DraftCommand(badForgeCapacity,startRequest,makeContext(1_000_000)),
 /invalid_trusted_snapshot/,'The client cannot mint extra Forge slots');
const expiredCapacity=create();
expiredCapacity.forgeSlotCapacity=3;
expiredCapacity.jobs=[{
 ...structuredClone(start.next.jobs[0]),id:'expired-slot',slotIndex:6,
 startedAtMs:1_000_000,finishesAtMs:3_000_000,
}];
const continued=resolveEquipmentV2DraftCommand(expiredCapacity,startRequest,makeContext(1_000_000));
assert.ok(continued.next.jobs[1].slotIndex<3,
 'New jobs use current capacity but old high-slot jobs must not be erased');

console.log('PASS: hidden V2 craft canonical recipes, Gold/material reservations, capacity, idempotency, replay and exact one-time claims');
