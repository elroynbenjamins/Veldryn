import assert from 'node:assert/strict';
import {v2ServerRecipeAndPiece} from '../equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome} from '../equipment-crafting-v2-rolls';
import {v2ServerCreateExactTemplate} from '../equipment-crafting-v2-instances';
import {verifyEquipmentV2StagingPhysicalReceipts,
 type V2PhysicalGameState,type V2PhysicalDeliveryReceipt}
 from '../equipment-crafting-v2-physical-delivery-staging';
import type {V2HiddenGameMetadata} from '../equipment-crafting-v2-game-metadata';
import type {V2DraftItem} from '../equipment-crafting-v2-transaction';

const authored=v2ServerRecipeAndPiece('EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
if(!authored)throw Error('missing_server_physical_fixture');
const outcome=draftEquipmentV2Outcome({
 recipeId:authored.recipe.id,pieceId:authored.piece.id,
 tier:authored.piece.tier,role:authored.piece.role,slot:authored.piece.slot,
},()=>0);
const item:V2DraftItem={
 id:'physical-exact-01',accountId:'eq2-physical-qa',ownerCharacterId:'original-crafter',
 jobId:'forge-original-job',createdAtMs:2_000_000_000_000,
 outcome,exactItem:v2ServerCreateExactTemplate(authored.piece,outcome),
};
const delivered:V2PhysicalDeliveryReceipt={
 requestId:'physical-delivery-01',instanceId:item.id,jobId:item.jobId,
 itemId:item.exactItem.pieceId,accountId:item.accountId,
 holderCharacterId:'original-crafter',location:'equipment_pouch',
 expectedVersion:17,claimRequestId:'eq2-claimed-01',
 physicallyDelivered:true,stagingOnly:true,
};
const ledger:V2HiddenGameMetadata&{physicalDeliveryReceipts:V2PhysicalDeliveryReceipt[]}={
 schemaVersion:'eq2-hidden-game-state-v1',jobs:[],items:[item],
 receipts:[{
  requestId:delivered.claimRequestId,commandFingerprint:'claim:'+item.jobId,
  response:{kind:'claimed',jobId:item.jobId,instanceId:item.id,
   exactItem:item.exactItem,outcome:item.outcome,xpAwarded:0,
   profession:'smithing',version:16},
 }],skillAwards:[],storageReservations:[],
 physicalDeliveryReceipts:[delivered],
};
const state:V2PhysicalGameState={
 version:11,
 character:{id:'original-crafter',gold:99,
  equipmentPouch:{capacity:30,stacks:[{
   itemId:item.exactItem.pieceId,instanceId:item.id,quantity:1,
  }]}},
 account:{craftedGearInstances:[],equipmentV2Hidden:ledger},
 inventory:{capacity:30,stacks:[]},
 bank:{capacity:40,stacks:[]},
 overflow:{stacks:[]},
 otherCharacters:[],
};
assert.doesNotThrow(()=>verifyEquipmentV2StagingPhysicalReceipts(
 state,item.accountId,ledger,
));
const input=JSON.stringify(state);
const duplicate=structuredClone(state);
duplicate.bank.stacks.push({itemId:item.exactItem.pieceId,instanceId:item.id,quantity:1});
assert.throws(()=>verifyEquipmentV2StagingPhysicalReceipts(
 duplicate,item.accountId,ledger,
),/v2_physical_delivery_custody_mismatch/);
const missing=structuredClone(state);
missing.character!.equipmentPouch!.stacks=[];
assert.throws(()=>verifyEquipmentV2StagingPhysicalReceipts(
 missing,item.accountId,ledger,
),/v2_physical_delivery_custody_mismatch/);
const badOwner=structuredClone(state);
badOwner.character!.id='other-owner';
assert.throws(()=>verifyEquipmentV2StagingPhysicalReceipts(
 badOwner,item.accountId,ledger,
),/missing_v2_physical_holder/);
const forged=structuredClone(ledger);
forged.physicalDeliveryReceipts[0].requestId='forged-response';
forged.physicalDeliveryReceipts[0].claimRequestId='non-existent-claim';
assert.throws(()=>verifyEquipmentV2StagingPhysicalReceipts(
 state,item.accountId,forged,
),/orphan_v2_physical_receipt/);
const absentReceipt=structuredClone(ledger);
absentReceipt.physicalDeliveryReceipts=[];
assert.throws(()=>verifyEquipmentV2StagingPhysicalReceipts(
 state,item.accountId,absentReceipt,
),/unreceipted_v2_physical_copy/);
assert.equal(JSON.stringify(state),input,'Read-only staging verification may not touch physical copies');
console.log('PASS: server-only staging custody verifies exact physical receipt, unique copy, ownership and original claim');
