import assert from 'node:assert/strict';
import {v2ServerRecipeAndPiece} from '../equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome} from '../equipment-crafting-v2-rolls';
import {v2ServerCreateExactTemplate} from '../equipment-crafting-v2-instances';
import {
 proposeEquipmentV2ClaimCustody,
} from '../equipment-crafting-v2-delivery';
import {
 reserveEquipmentV2HiddenClaim,verifyEquipmentV2StorageReservations,
} from '../equipment-crafting-v2-storage-reservations';
import type {V2LegacyAccountCustodyView} from '../equipment-crafting-v2-legacy-custody-view';
import type {V2DraftItem} from '../equipment-crafting-v2-transaction';

const manifest=v2ServerRecipeAndPiece('EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
if(!manifest)throw Error('missing_eq2_delivery_fixture');
const outcome=draftEquipmentV2Outcome({
 recipeId:manifest.recipe.id,pieceId:manifest.piece.id,
 tier:manifest.piece.tier,role:manifest.piece.role,slot:manifest.piece.slot,
},()=>0);
const item:V2DraftItem={
 id:'eq2-copy-01',accountId:'account-A',ownerCharacterId:'hero-A',
 createdAtMs:2_000_000_000_000,jobId:'forge-job-01',outcome,
 exactItem:v2ServerCreateExactTemplate(manifest.piece,outcome),
};
const state=():V2LegacyAccountCustodyView=>({
 account:{craftedGearInstances:[]},
 character:{id:'hero-A',equipmentPouch:{capacity:30,stacks:[]}},
 otherCharacters:[],
 inventory:{capacity:40,stacks:[]},
 bank:{capacity:40,stacks:[]},
 overflow:{stacks:[]},
});
const live=state(),before=JSON.stringify(live);
const preview=proposeEquipmentV2ClaimCustody(live,'account-A',item);
assert.equal(preview.instanceId,item.id);
assert.equal(preview.suggestedLocation,'equipment_pouch');
assert.equal(preview.physicallyDelivered,false);
assert.equal(preview.requiresSingleAccountCommit,true);
assert.deepEqual(preview.stack,{itemId:item.exactItem.pieceId,instanceId:item.id,quantity:1});
assert.equal(JSON.stringify(live),before,'Preflight must not grant real gear');
const reserved=reserveEquipmentV2HiddenClaim(live,'account-A',item,[]);
assert.equal(reserved.reservation.destination,'equipment_pouch');
assert.equal(reserved.reservation.quantity,1);
assert.equal(reserved.delivery.physicallyDelivered,false);
assert.doesNotThrow(()=>verifyEquipmentV2StorageReservations('account-A',[item],[reserved.reservation]));
assert.throws(()=>reserveEquipmentV2HiddenClaim(live,'account-A',item,[reserved.reservation]),
 /duplicate_v2_storage_reservation/);
assert.throws(()=>proposeEquipmentV2ClaimCustody(live,'account-B',item),
 /invalid_v2_delivery_copy/);
const collided=state();
collided.bank.stacks=[{itemId:item.exactItem.pieceId,instanceId:item.id,quantity:1}];
assert.throws(()=>proposeEquipmentV2ClaimCustody(collided,'account-A',item),
 /v2_delivery_instance_collision/);
const orphan=state();orphan.character={id:'hero-B'};
assert.throws(()=>proposeEquipmentV2ClaimCustody(orphan,'account-A',item),
 /unknown_v2_delivery_owner/);
const switched=state();switched.character={id:'hero-B'};
switched.otherCharacters=[{character:{id:'hero-A',equipmentPouch:{capacity:40,stacks:[]}},
 inventory:{capacity:50,stacks:[]},overflow:{stacks:[]}}];
assert.equal(proposeEquipmentV2ClaimCustody(switched,'account-A',item).ownerCharacterId,
 'hero-A','Original crafter retains ownership after character switching');
const full=state();
full.character!.equipmentPouch={capacity:30,stacks:Array.from({length:30},(_,i)=>({
 itemId:'LEGACY_GEAR',instanceId:'old-'+i,quantity:1,
}))};
full.inventory.capacity=0;
const deferred=reserveEquipmentV2HiddenClaim(full,'account-A',item,[]);
assert.equal(deferred.reservation.destination,'deferred');
assert.equal(deferred.delivery.reason,'storage_full');
assert.equal(deferred.delivery.physicallyDelivered,false);
assert.equal(full.character!.equipmentPouch!.stacks.length,30,
 'Full pouch must not delete, sell or overwrite legacy gear');
assert.deepEqual(full.inventory.stacks,[],'Deferred EQ2 never consumes active Inventory');
console.log('PASS: isolated EQ2 delivery never creates physical gear, enforces owner/copy uniqueness, and defers full storage');
