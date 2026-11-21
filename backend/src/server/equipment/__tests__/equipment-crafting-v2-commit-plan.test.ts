import assert from 'node:assert/strict';
import {V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {planEquipmentV2AtomicCommit} from '../equipment-crafting-v2-commit-plan';
import type {V2DraftSnapshot,V2DraftContext,V2DraftCommand} from '../equipment-crafting-v2-transaction';

const recipe=V2_SERVER_RECIPES.find(x=>x.id==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
assert.ok(recipe);
const now=2000000000000;
let randomSerial=0;
const ctx=(time=now,characterId='hero-a'):V2DraftContext=>({
 accountId:'account-a',characterId,nowMs:time,
 randomId:()=>['job-a','item-a'][randomSerial++]??'id-'+randomSerial,
 randomInt:()=>0,
});
const makeSnapshot=():V2DraftSnapshot=>({
 accountId:'account-a',activeCharacterId:'hero-a',version:42,forgeSlotCapacity:3,
 characters:{
  'hero-a':{
   level:40,gold:20000,professionLevels:{smithing:50,tailoring:50},
   inventory:Object.fromEntries(recipe.inputs.map(x=>[x.itemId,Math.ceil(x.quantity/2)])),
  },
  'hero-b':{level:40,gold:7777,professionLevels:{smithing:50,tailoring:50},
   inventory:{GREENWOOD_LOG:900}},
 },
 bank:Object.fromEntries(recipe.inputs.map(x=>[x.itemId,Math.floor(x.quantity/2)])),
 jobs:[],equipment:[],skillAwards:[],receipts:[],
});
const start:V2DraftCommand={kind:'start',recipeId:recipe.id,requestId:'start-atomic-0001',expectedVersion:42};
const initial=makeSnapshot(),before=structuredClone(initial);
const begun=planEquipmentV2AtomicCommit(initial,start,ctx());
assert.deepEqual(initial,before,'Commit planning must not mutate loaded gameplay data');
assert.equal(begun.plan.commandKind,'start');
assert.equal(begun.plan.needsLegacyCoexistenceAdapter,true,'Never treat this preview as a production commit');
assert.equal(begun.plan.expectedWalletGold,20000);
assert.equal(begun.plan.nextWalletGold,20000-recipe.gold);
assert.equal(begun.plan.expectedVersion,42);
assert.equal(begun.plan.nextVersion,43);
assert.equal(begun.plan.createdJob?.recipeId,recipe.id);
assert.equal(begun.plan.createdJob?.ownerCharacterId,'hero-a');
assert.equal(begun.plan.createdJob?.craftContract.assemblyGold,recipe.gold);
assert.equal(begun.plan.createdItem,undefined,'Start must not mint equipment');
assert.equal(begun.plan.awardedXp,undefined,'Start must not grant crafting XP');
assert.equal(begun.resolution.next.characters['hero-b'].gold,7777,
 'Other character wallet cannot be charged for a first character craft');
const total=new Map(recipe.inputs.map(x=>[x.itemId,x.quantity]));
for(const ingredient of begun.plan.debitedMaterialsFromCharacter){
 assert.ok(ingredient.quantity>0);
 assert.ok(total.has(ingredient.itemId));
}
for(const ingredient of recipe.inputs){
 const personal=begun.plan.debitedMaterialsFromCharacter.find(x=>x.itemId===ingredient.itemId)?.quantity??0;
 const shared=begun.plan.debitedMaterialsFromBank.find(x=>x.itemId===ingredient.itemId)?.quantity??0;
 assert.equal(personal+shared,ingredient.quantity,'Full canonical recipe required across owner pack and Bank');
}
const repeated=planEquipmentV2AtomicCommit(begun.resolution.next,start,ctx());
assert.equal(repeated.plan.replayed,true);
assert.equal(repeated.plan.expectedWalletGold,repeated.plan.nextWalletGold);
assert.equal(repeated.plan.createdJob,undefined);
assert.deepEqual(repeated.plan.debitedMaterialsFromCharacter,[]);
assert.deepEqual(repeated.plan.debitedMaterialsFromBank,[]);
assert.deepEqual(repeated.plan.response,begun.plan.response,'Replay must retain immutable start receipt');
assert.deepEqual(repeated.resolution.next,begun.resolution.next,'No replay write is needed');

const alreadyComplete=structuredClone(begun.resolution.next);
alreadyComplete.activeCharacterId='hero-b';
const claim:V2DraftCommand={kind:'claim',requestId:'claim-atomic-0001',expectedVersion:43,jobId:'job-a'};
const finish=alreadyComplete.jobs.find(j=>j.id==='job-a')!.finishesAtMs;
const settled=planEquipmentV2AtomicCommit(alreadyComplete,claim,ctx(finish,'hero-b'));
assert.equal(settled.plan.commandKind,'claim');
assert.equal(settled.plan.expectedWalletGold,7777);
assert.equal(settled.plan.nextWalletGold,7777,'Claiming another character Forge output never charges active wallet');
assert.equal(settled.plan.claimedJobId,'job-a');
assert.equal(settled.plan.createdItem?.ownerCharacterId,'hero-a');
assert.equal(settled.plan.awardedXp?.characterId,'hero-a');
assert.equal(settled.plan.awardedXp?.xp,recipe.xp);
assert.equal(settled.plan.createdItem?.exactItem.pieceId,recipe.pieceId);
assert.equal(settled.plan.createdItem?.exactItem.rarity,'mythic');
assert.equal(settled.plan.createdItem?.exactItem.quality,0);
assert.deepEqual(settled.plan.debitedMaterialsFromCharacter,[]);
assert.deepEqual(settled.plan.debitedMaterialsFromBank,[]);
assert.deepEqual(settled.plan.createdItem?.exactItem,
 settled.plan.response.kind==='claimed'?settled.plan.response.exactItem:null);
assert.equal(settled.resolution.next.characters['hero-a'].gold,20000-recipe.gold);
assert.equal(settled.resolution.next.characters['hero-b'].gold,7777);
const retryClaim=planEquipmentV2AtomicCommit(settled.resolution.next,claim,ctx(finish+100,'hero-b'));
assert.equal(retryClaim.plan.replayed,true);
assert.equal(retryClaim.plan.createdItem,undefined);
assert.equal(retryClaim.resolution.next.equipment.length,1);
assert.equal(retryClaim.resolution.next.skillAwards.length,1);
assert.deepEqual(retryClaim.plan.response,settled.plan.response);

const noBank=makeSnapshot();noBank.bank={};
assert.throws(()=>planEquipmentV2AtomicCommit(noBank,start,ctx()),
 /insufficient_materials/,'No plan can authorize missing account resources');
const secondOwner=makeSnapshot();secondOwner.characters['hero-a'].gold=recipe.gold-1;
assert.throws(()=>planEquipmentV2AtomicCommit(secondOwner,start,ctx()),
 /insufficient_gold/,'No plan can authorize more Gold than the loaded wallet');
const stale=makeSnapshot();
assert.throws(()=>planEquipmentV2AtomicCommit(stale,{...start,expectedVersion:41},ctx()),
 /stale_game_version/,'Actual online commit version is a precondition');

console.log('PASS: hidden V2 one-commit plan verifies conservation, Gold CAS, legacy gate, original-owner XP and retry-safe receipts');
