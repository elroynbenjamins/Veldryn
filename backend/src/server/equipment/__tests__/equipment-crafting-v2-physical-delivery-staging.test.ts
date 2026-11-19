import assert from 'node:assert/strict';
import {newGame,createCharacter} from '../../../../../apps/mobile/src/core/game';
import {V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {simulateEquipmentV2InGameState,type V2HiddenGameInput,type V2HiddenGameMetadata} from '../equipment-crafting-v2-game-state';
import {
 simulateEquipmentV2PhysicalDeliveryStaging,runEquipmentV2PhysicalDelivery,
 verifyEquipmentV2StagingPhysicalReceipts,
} from '../equipment-crafting-v2-physical-delivery-staging';

const now=2_000_000_000_000,accountId='physical-staging-fixture';
const recipe=V2_SERVER_RECIPES.find(row=>row.id==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
assert.ok(recipe);
function initial(){
 const state=createCharacter(newGame(now),'IRONWARDEN');
 assert.ok(state.character);
 state.character.level=35;state.character.gold=50000;
 state.account.equipmentCraftingQueue=[];state.account.craftedGearInstances=[];
 state.inventory.stacks=recipe.inputs.map(row=>({itemId:row.itemId,quantity:row.quantity}));
 return state;
}
let idIndex=0;
const ids=['physical-job-1','physical-copy-1'];
const forge=(state:ReturnType<typeof initial>,command:V2HiddenGameInput['command'],onlineVersion:number,time=now):V2HiddenGameInput=>({
 state,accountId,onlineVersion,onlineCharacterId:state.character!.id,
 authoritativeWalletGold:state.character!.gold,command,nowMs:time,
 randomInt:()=>0,randomId:()=>ids[idIndex++]??'fallback-'+idIndex,
});
const start=simulateEquipmentV2InGameState(forge(initial(),{
 kind:'start',requestId:'physical-start-01',expectedVersion:10,recipeId:recipe.id,
},10));
const claimed=simulateEquipmentV2InGameState(forge(start.state,{
 kind:'claim',requestId:'physical-claim-01',expectedVersion:11,
 jobId:start.plan.createdJob!.id,
},11,start.plan.createdJob!.finishesAtMs));
const item=claimed.plan.createdItem!;
const input=(state:typeof claimed.state,requestId='physical-store-01',version=12)=>({
 state,accountId,onlineVersion:version,
 onlineCharacterId:state.character!.id,authoritativeWalletGold:state.character!.gold,
 requestId,expectedVersion:version,instanceId:item.id,
 stagingFixture:'eq2-isolated-catalog-fixture-v1' as const,
});
const frozen=JSON.stringify((claimed.state.account.equipmentV2Hidden as V2HiddenGameMetadata).items[0].exactItem);
const before=JSON.stringify(claimed.state);
const first=simulateEquipmentV2PhysicalDeliveryStaging(input(claimed.state));
assert.equal(first.replayed,false);
assert.equal(first.deferred,false);
assert.equal(first.receipt?.physicallyDelivered,true);
assert.equal(first.receipt?.stagingOnly,true);
assert.equal(first.receipt?.itemId,item.exactItem.pieceId);
assert.equal(first.receipt?.location,'equipment_pouch');
assert.equal(first.state.character!.equipmentPouch!.stacks.filter(row=>row.instanceId===item.id).length,1);
assert.equal(first.state.account.craftedGearInstances?.length,0,'Old V33 records never receive an EQ2 item');
assert.equal(first.state.bank.stacks.length,claimed.state.bank.stacks.length,'The real Bank stays unchanged');
assert.equal(first.state.character!.gold,claimed.state.character!.gold,'Delivery has no second Gold cost');
assert.equal(first.state.version,claimed.state.version);
assert.equal(JSON.stringify(claimed.state),before,'The source snapshot must never be mutated');
assert.equal(JSON.stringify((first.state.account.equipmentV2Hidden as V2HiddenGameMetadata).items[0].exactItem),frozen);
assert.equal(first.commit?.rpcName,'commit_online_game_guild_pve_v1');
assert.equal(first.commit?.previewOnly,true);
assert.equal(first.commit?.productionReady,false);
assert.deepEqual(Object.keys(first.commit!.args).sort(),[
 'p_account_id','p_expected_gold','p_expected_version','p_request_hash',
 'p_request_id','p_response','p_contributions',
].sort());
const replay=simulateEquipmentV2PhysicalDeliveryStaging(input(first.state));
assert.equal(replay.replayed,true);
assert.strictEqual(replay.state,first.state);
assert.deepEqual(replay.receipt,first.receipt);
assert.equal(replay.commit,null);
assert.throws(()=>simulateEquipmentV2PhysicalDeliveryStaging(input(first.state,'physical-store-02',13)),
 /v2_physical_copy_already_delivered/,
 'A second request must never double-materialize a claimed copy');
assert.throws(()=>simulateEquipmentV2PhysicalDeliveryStaging(input(claimed.state,'physical-stale-01',13)),
 /stale_v2_physical_version/);
assert.throws(()=>simulateEquipmentV2PhysicalDeliveryStaging({
 ...input(claimed.state),stagingFixture:'invalid' as never,
}),/v2_staging_fixture_required/);
assert.throws(()=>runEquipmentV2PhysicalDelivery(input(claimed.state)),
 /equipment_crafting_v2_not_released/,
 'The staging fixture is NOT a public route and cannot bypass the feature gate');

const collision=structuredClone(claimed.state);
collision.bank.stacks.push({itemId:'basic_sword',instanceId:item.id,quantity:1});
assert.throws(()=>simulateEquipmentV2PhysicalDeliveryStaging(input(collision)),
 /v2_physical_duplicate_instance/);
const broken=structuredClone(first.state);
broken.character!.equipmentPouch!.stacks.push({
 itemId:item.exactItem.pieceId,instanceId:item.id,quantity:1,
});
assert.throws(()=>verifyEquipmentV2StagingPhysicalReceipts(
 broken,accountId,broken.account.equipmentV2Hidden as V2HiddenGameMetadata,
),/v2_physical_delivery_custody_mismatch/);

const full=structuredClone(claimed.state);
full.character!.equipmentPouch={capacity:30,
 stacks:Array.from({length:30},()=>({itemId:'basic_sword',quantity:1}))};
full.inventory.capacity=full.inventory.stacks.length;
const deferred=simulateEquipmentV2PhysicalDeliveryStaging(input(full,'physical-defer-01'));
assert.equal(deferred.deferred,true);
assert.equal(deferred.receipt,null);
assert.strictEqual(deferred.state,full,'Full storage preserves the entire original item/claim');
const recovered=structuredClone(full);
recovered.character!.equipmentPouch!.stacks.pop();
const deliver=simulateEquipmentV2PhysicalDeliveryStaging(input(recovered,'physical-retry-01'));
assert.equal(deliver.receipt?.physicallyDelivered,true);
assert.equal(deliver.state.character!.equipmentPouch!.stacks.length,30);
console.log('PASS: unreleased staging-only physical exact-copy delivery candidate, native online RPC shape, one-time receipts, collision, deferral, rollback-safe GameState and release gate');
