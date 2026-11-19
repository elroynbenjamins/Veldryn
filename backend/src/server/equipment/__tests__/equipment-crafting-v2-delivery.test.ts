import assert from 'node:assert/strict';
import {newGame,createCharacter} from '../../../../../apps/mobile/src/core/game';
import {v2ServerRecipeAndPiece,V2_SERVER_MANIFEST_VERSION} from '../equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome,EQUIPMENT_V2_SERVER_RULES_VERSION} from '../equipment-crafting-v2-rolls';
import {v2ServerCreateExactTemplate} from '../equipment-crafting-v2-instances';
import {
 proposeEquipmentV2ClaimCustody,verifyEquipmentV2HiddenLedger,
} from '../equipment-crafting-v2-delivery';
import type {V2DraftItem,V2DraftJob,V2DraftReceipt,V2DraftSkillAward} from '../equipment-crafting-v2-transaction';

const accountId='delivery-account-1',now=2_000_000_000_000;
const state=createCharacter(newGame(now),'IRONWARDEN');
assert.ok(state.character);
const owner=state.character.id;
const match=v2ServerRecipeAndPiece('EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
assert.ok(match);
const {recipe,piece}=match;
const outcome=draftEquipmentV2Outcome({
 recipeId:recipe.id,pieceId:piece.id,tier:piece.tier,slot:piece.slot,role:piece.role,
},()=>0);
const exactItem=v2ServerCreateExactTemplate(piece,outcome);
const job:V2DraftJob={
 id:'delivery-job-1',accountId,ownerCharacterId:owner,recipeId:recipe.id,pieceId:piece.id,
 startedAtMs:now,finishesAtMs:now+recipe.seconds*1000,slotIndex:0,
 goldReserved:recipe.gold,materialsReserved:[],status:'claimed',resultId:'delivery-copy-1',
 craftContract:{
  manifestVersion:V2_SERVER_MANIFEST_VERSION,rulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
  recipeId:recipe.id,piece,profession:recipe.profession,assemblyGold:recipe.gold,
  xpAwarded:recipe.xp,craftSeconds:recipe.seconds,
 },
};
const item:V2DraftItem={
 id:'delivery-copy-1',accountId,ownerCharacterId:owner,createdAtMs:now+recipe.seconds*1000,
 jobId:job.id,outcome,exactItem,
};
const award:V2DraftSkillAward={characterId:owner,profession:recipe.profession,xp:recipe.xp,jobId:job.id};
const started:V2DraftReceipt={
 requestId:'delivery-start-001',commandFingerprint:'start:'+recipe.id,
 response:{kind:'started',jobId:job.id,recipeId:recipe.id,pieceId:piece.id,
  finishesAtMs:job.finishesAtMs,goldCharged:recipe.gold,version:10},
};
const claimed:V2DraftReceipt={
 requestId:'delivery-claim-001',commandFingerprint:'claim:'+job.id,
 response:{kind:'claimed',jobId:job.id,instanceId:item.id,outcome,exactItem,
  xpAwarded:recipe.xp,profession:recipe.profession,version:11},
};
const good=()=>verifyEquipmentV2HiddenLedger(accountId,[job],[item],[started,claimed],[award]);
assert.throws(()=>verifyEquipmentV2HiddenLedger(accountId,[null as never],[item],[started,claimed],[award]),
 /corrupted_hidden_v2_metadata/,'Malformed saved records must not crash or be auto-repaired');
assert.throws(()=>verifyEquipmentV2HiddenLedger('not-original-account',[job],[item],[started,claimed],[award]),
 /invalid_hidden_v2_job/,'A saved ledger may never be replayed in another account');

assert.doesNotThrow(good);
assert.doesNotThrow(()=>verifyEquipmentV2HiddenLedger(accountId,[{
 ...job,status:'queued',resultId:undefined,
}],[],[started],[]),'A queued craft has a valid start receipt but no item yet');
assert.throws(()=>verifyEquipmentV2HiddenLedger(accountId,[job],[item,item],[started,claimed],[award]),
 /duplicate_hidden_v2_item/);
assert.throws(()=>verifyEquipmentV2HiddenLedger(accountId,[job],[item],[started,claimed,claimed],[award]),
 /duplicate_hidden_v2_receipt/);
assert.throws(()=>verifyEquipmentV2HiddenLedger(accountId,[job],[item],[started],[award]),
 /missing_hidden_v2_receipt/);
assert.throws(()=>verifyEquipmentV2HiddenLedger(accountId,[job],[item],[
 started,{...claimed,response:{...claimed.response,instanceId:'forged-copy'} as typeof claimed.response},
],[award]),/invalid_hidden_v2_claim_receipt/);
assert.throws(()=>verifyEquipmentV2HiddenLedger(accountId,[{...job,ownerCharacterId:'forged-owner'}],
 [item],[started,claimed],[award]),/invalid_hidden_v2_claim_settlement/);
assert.throws(()=>verifyEquipmentV2HiddenLedger(accountId,[job],[{
 ...item,exactItem:{...exactItem,gemSlots:[{socketId:'stat',gemId:'FREE_GEM',gemInstanceId:'free'}]},
 } as V2DraftItem],[started,claimed],[award]),/invalid_hidden_v2_exact_copy/);

const originalStateJSON=JSON.stringify(state);
const copyState=structuredClone(state);
copyState.character!.equipmentPouch={stacks:[],capacity:1};
const first=proposeEquipmentV2ClaimCustody(copyState,accountId,item);
assert.throws(()=>proposeEquipmentV2ClaimCustody(copyState,'wrong-account',item),
 /invalid_v2_delivery_copy/,'A gear receipt may not be proposed under a different account');
assert.equal(first.suggestedLocation,'equipment_pouch');
assert.equal(first.physicallyDelivered,false);
assert.equal(first.requiresSingleAccountCommit,true);
assert.deepEqual(first.stack,{itemId:piece.id,instanceId:item.id,quantity:1});
copyState.character!.equipmentPouch.stacks.push({itemId:'LEGACY_GEAR',quantity:1});
assert.equal(proposeEquipmentV2ClaimCustody(copyState,accountId,item).suggestedLocation,'inventory');
copyState.inventory.capacity=copyState.inventory.stacks.length;
const deferred=proposeEquipmentV2ClaimCustody(copyState,accountId,item);
assert.equal(deferred.suggestedLocation,'deferred');
assert.equal(deferred.reason,'storage_full','No copy is discarded or rerolled when both stores are full');
assert.equal(deferred.physicallyDelivered,false);
assert.throws(()=>proposeEquipmentV2ClaimCustody({
 ...copyState,inventory:{...copyState.inventory,capacity:-1},
},accountId,item),/invalid_v2_delivery_capacity/);

const different=createCharacter(newGame(now),'WAYFINDER');
assert.ok(different.character);
different.character.id='wayfinder-alternate';
different.character.equipmentPouch={stacks:[],capacity:1};
const alternateItem={...item,ownerCharacterId:'wayfinder-alternate'};
const alternate=structuredClone(state);
alternate.otherCharacters=[{
 character:different.character,inventory:different.inventory,overflow:different.overflow,
 activity:different.activity,skills:different.skills,quests:different.quests,
 currentRegionId:different.currentRegionId,
}];
assert.equal(proposeEquipmentV2ClaimCustody(alternate,accountId,alternateItem).ownerCharacterId,'wayfinder-alternate');
assert.equal(proposeEquipmentV2ClaimCustody(alternate,accountId,alternateItem).suggestedLocation,'equipment_pouch');
assert.throws(()=>proposeEquipmentV2ClaimCustody(alternate,accountId,{
 ...item,ownerCharacterId:'non-account-character',
}),/unknown_v2_delivery_owner/);

const collision=structuredClone(state);
collision.bank.stacks.push({itemId:'OLD_HELM',instanceId:item.id,quantity:1});
assert.throws(()=>proposeEquipmentV2ClaimCustody(collision,accountId,item),/v2_delivery_instance_collision/,
 'Exact-copy IDs must never collide with an existing physical Bank marker');
assert.equal(JSON.stringify(state),originalStateJSON,
 'The original live GameState remains untouched by delivery previews');
console.log('PASS: hidden V2 claim receipt integrity, original-crafter delivery, storage fallback and collision denial');
