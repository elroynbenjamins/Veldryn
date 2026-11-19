import assert from 'node:assert/strict';
import {newGame,createCharacter} from '../../../../../apps/mobile/src/core/game';
import {switchAccountCharacter} from '../../../../../apps/mobile/src/core/account-actions';
import {V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {simulateEquipmentV2InGameState,type V2HiddenGameInput} from '../equipment-crafting-v2-game-state';
import {
 simulateEquipmentV2VirtualCustody,readEquipmentV2VirtualCustody,runEquipmentV2VirtualCustody,
 type V2VirtualMoveCommand,type V2VirtualMoveInput,type V2VirtualLedger,
} from '../equipment-crafting-v2-virtual-custody';

const accountId='virtual-custody-test',now=2_000_000_000_000;
const recipe=V2_SERVER_RECIPES.find(row=>row.id==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
assert.ok(recipe);
const state=createCharacter(newGame(now),'IRONWARDEN');
assert.ok(state.character);
state.character.level=35;state.character.gold=50000;
state.account.equipmentCraftingQueue=[];state.account.craftedGearInstances=[];
state.inventory.stacks=recipe.inputs.map(row=>({itemId:row.itemId,quantity:row.quantity}));
state.character.equipment.helmet=undefined;
const owner=state.character.id;
let generated=0;
const ids=['virtual-job-1','virtual-copy-1'];
const forge=(s:typeof state,command:V2HiddenGameInput['command'],version:number,time=now):V2HiddenGameInput=>({
 state:s,accountId,onlineVersion:version,onlineCharacterId:s.character!.id,
 authoritativeWalletGold:s.character!.gold,command,nowMs:time,
 randomInt:()=>0,randomId:()=>ids[generated++]??'random-fallback-'+generated,
});
const started=simulateEquipmentV2InGameState(forge(state,{
 kind:'start',requestId:'virtual-start-0001',expectedVersion:10,recipeId:recipe.id,
},10));
const job=started.plan.createdJob!;
const claimed=simulateEquipmentV2InGameState(forge(started.state,{
 kind:'claim',requestId:'virtual-claim-0001',expectedVersion:11,jobId:job.id,
},11,job.finishesAtMs));
const instanceId=claimed.plan.createdItem!.id;
const request=(kind:V2VirtualMoveCommand['kind'],requestId:string,version:number):V2VirtualMoveCommand=>({
 kind,requestId,expectedVersion:version,instanceId,
});
const input=(s:typeof state,command:V2VirtualMoveCommand,version:number):V2VirtualMoveInput=>({
 state:s,accountId,onlineVersion:version,onlineCharacterId:s.character?.id??null,
 authoritativeWalletGold:s.character?.gold??null,command,
});
const before=JSON.stringify(claimed.state);
const banked=simulateEquipmentV2VirtualCustody(input(claimed.state,
 request('deposit_bank','virtual-bank-0001',12),12));
assert.equal(banked.receipt.from,'pouch');
assert.equal(banked.receipt.to,'bank');
assert.equal(banked.receipt.newHolder,null);
assert.equal(banked.receipt.physicallyDelivered,false);
assert.strictEqual(banked.state.bank,claimed.state.bank,'No public Bank changes');
assert.equal(JSON.stringify(claimed.state),before,'Existing GameState stays immutable');
assert.equal((banked.state.account.equipmentV2Hidden as V2VirtualLedger).items.length,1);
const repeat=simulateEquipmentV2VirtualCustody(input(banked.state,
 request('deposit_bank','virtual-bank-0001',12),13));
assert.equal(repeat.replayed,true);assert.strictEqual(repeat.state,banked.state);
assert.deepEqual(repeat.receipt,banked.receipt);
assert.throws(()=>simulateEquipmentV2VirtualCustody(input(banked.state,
 request('deposit_bank','virtual-bank-0002',12),13)),/stale_v2_virtual_version/);
assert.throws(()=>simulateEquipmentV2VirtualCustody(input(banked.state,
 request('withdraw_bank','virtual-bank-0001',13),13)),/v2_virtual_request_id_conflict/);
const other=createCharacter(newGame(now),'WAYFINDER');
assert.ok(other.character);other.character.id='virtual-other';other.character.level=35;
other.character.equipment.helmet=undefined;
const withOther=structuredClone(banked.state);
withOther.otherCharacters=[{
 character:other.character,inventory:other.inventory,overflow:other.overflow,
 activity:other.activity,skills:other.skills,quests:other.quests,
 currentRegionId:other.currentRegionId,
}];
const alternate=switchAccountCharacter(withOther,other.character.id,now);
const withdrawn=simulateEquipmentV2VirtualCustody(input(alternate,
 request('withdraw_bank','virtual-withdraw-001',13),13));
assert.equal(withdrawn.receipt.to,'pouch');
assert.equal(withdrawn.receipt.newHolder,other.character.id);
assert.equal(withdrawn.state.otherCharacters?.length,1);
const worn=simulateEquipmentV2VirtualCustody(input(withdrawn.state,
 request('equip','virtual-equip-0001',14),14));
assert.equal(worn.receipt.to,'equipped');
assert.equal(worn.receipt.equippedSlot,'helmet');
assert.equal(worn.state.character!.equipment.helmet,undefined,'No public combat equip is modified');
assert.equal(worn.state.account.craftedGearInstances?.length,0,'Existing V33 crafted records unchanged');
const removed=simulateEquipmentV2VirtualCustody(input(worn.state,
 request('unequip','virtual-unequip-01',15),15));
assert.equal(removed.receipt.to,'pouch');
assert.equal(removed.receipt.equippedSlot,undefined);
const materialsRestored=structuredClone(removed.state);
materialsRestored.inventory.stacks.push(...recipe.inputs.map(row=>({
 itemId:row.itemId,quantity:row.quantity,
})));
const anotherForge=simulateEquipmentV2InGameState(forge(materialsRestored,{
 kind:'start',requestId:'virtual-next-forge-01',expectedVersion:16,recipeId:recipe.id,
},16));
assert.deepEqual((anotherForge.state.account.equipmentV2Hidden as V2VirtualLedger).custodyReceipts,
 (removed.state.account.equipmentV2Hidden as V2VirtualLedger).custodyReceipts,
 'Later Forge commands must not destroy earlier Bank custody receipts');
assert.throws(()=>simulateEquipmentV2InGameState(forge(materialsRestored,{
 kind:'start',requestId:'virtual-bank-0001',expectedVersion:16,recipeId:recipe.id,
},16)),/v2_cross_command_request_id_conflict/,
 'Forge and custody cannot reuse the same idempotency key');

assert.throws(()=>simulateEquipmentV2VirtualCustody(input(withdrawn.state,
 request('withdraw_bank','virtual-own-0001',14),14)),/invalid_v2_virtual_transition/,
 'Invalid duplicate or wrong virtual transitions must fail');
const corrupted=structuredClone(worn.state);
const metadata=corrupted.account.equipmentV2Hidden as V2VirtualLedger;
metadata.custodyReceipts![0].newHolder='stolen-owner';
assert.throws(()=>simulateEquipmentV2VirtualCustody(input(corrupted,
 request('unequip','virtual-corrup-001',15),15)),/v2_virtual_move_owner_conflict/);
const gap=structuredClone(worn.state);
const ledger=gap.account.equipmentV2Hidden as V2VirtualLedger;
ledger.storageReservations=[];
assert.throws(()=>readEquipmentV2VirtualCustody(ledger.items,ledger.storageReservations!,
 ledger.custodyReceipts??[]),/unreconciled_v2_virtual_claim/);
const full=structuredClone(claimed.state);
full.bank.capacity=full.bank.stacks.length;
assert.throws(()=>simulateEquipmentV2VirtualCustody(input(full,
 request('deposit_bank','virtual-full-0001',12),12)),/v2_virtual_bank_full/,
 'Account Bank capacity must include actual V33 stacks and virtual placements');
const legacy=structuredClone(withdrawn.state);
legacy.character!.equipment.helmet='basic_sword';
assert.throws(()=>simulateEquipmentV2VirtualCustody(input(legacy,
 request('equip','virtual-legacy-001',14),14)),/v2_legacy_equipped_slot_conflict/);
assert.throws(()=>runEquipmentV2VirtualCustody(input(claimed.state,
 request('deposit_bank','virtual-gate-001',12),12)),/equipment_crafting_v2_not_released/);
console.log('PASS: hidden Equipment 2.0 virtual copy custody Bank transfer, cross-character equip, full storage, idempotency, V33 isolation and release fence');
