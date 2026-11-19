import assert from 'node:assert/strict';
import {newGame,createCharacter} from '../../../../../apps/mobile/src/core/game';
import {switchAccountCharacter} from '../../../../../apps/mobile/src/core/account-actions';
import {V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {simulateEquipmentV2InGameState,type V2HiddenGameInput} from '../equipment-crafting-v2-game-state';
import {
 simulateEquipmentV2GemInGameState,runEquipmentV2GemInGameState,
 verifyEquipmentV2GemSidecar,type V2HiddenGemInput,type V2GemSidecarState,
} from '../equipment-crafting-v2-gem-sidecar';

const now=2_000_000_000_000,accountId='gem-sidecar-account';
const recipe=V2_SERVER_RECIPES.find(row=>row.id==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
assert.ok(recipe);
const state=createCharacter(newGame(now),'IRONWARDEN');
assert.ok(state.character);
state.character.level=20;state.character.gold=25000;
state.inventory.stacks=recipe.inputs.map(row=>({itemId:row.itemId,quantity:row.quantity}));
state.account.equipmentCraftingQueue=[];
state.account.craftedGearInstances=[];
const firstGem='gem:stat_might:g1',replacementGem='gem:stat_keen:g1';
state.account.gemPouch={
 capacity:30,stacks:[{itemId:firstGem,quantity:2},{itemId:replacementGem,quantity:1},
  {itemId:'gem:effect_momentum:g1',quantity:1}],
};
const owner=state.character.id;
let idIndex=0;const ids=['forge-gem-job-1','forge-gem-copy-1'];
const forgeInput=(s:typeof state,command:V2HiddenGameInput['command'],version:number,at=now):V2HiddenGameInput=>({
 state:s,accountId,onlineCharacterId:s.character!.id,onlineVersion:version,
 authoritativeWalletGold:s.character!.gold,nowMs:at,command,
 randomId:()=>ids[idIndex++]??'unused-'+idIndex,randomInt:()=>0,
});
const started=simulateEquipmentV2InGameState(forgeInput(state,{
 kind:'start',requestId:'gem-start-00001',expectedVersion:10,recipeId:recipe.id,
},10));
const jobId=started.plan.createdJob?.id;
assert.ok(jobId);
const claimed=simulateEquipmentV2InGameState(forgeInput(started.state,{
 kind:'claim',requestId:'gem-claim-00001',expectedVersion:11,jobId,
},11,started.plan.createdJob!.finishesAtMs));
assert.equal(claimed.replayed,false);
const itemId=claimed.plan.createdItem?.id;
assert.ok(itemId);
assert.equal(claimed.delivery?.physicallyDelivered,false);
const frozen=JSON.stringify(claimed.plan.createdItem?.exactItem);
const command=(requestId:string,expectedVersion:number,gemId:string):V2HiddenGemInput['command']=>({
 requestId,expectedVersion,instanceId:itemId,gemId,
});
const input=(s:typeof state,c:V2HiddenGemInput['command'],version:number,roll:number):V2HiddenGemInput=>({
 state:s,accountId,onlineVersion:version,onlineCharacterId:s.character!.id,
 authoritativeWalletGold:s.character!.gold,command:c,serverRollPercent:roll,
});
const initialBalance=claimed.state.account.gemPouch!.stacks.find(row=>row.itemId===firstGem)!.quantity;
const initialState=JSON.stringify(claimed.state);
const first=simulateEquipmentV2GemInGameState(input(claimed.state,command('gem-place-0001',12,firstGem),12,90));
assert.equal(first.replayed,false);
assert.equal(first.receipt.source,'gem_pouch');
assert.equal(first.receipt.rollPercent,90);
assert.equal(first.receipt.burnedGemId,null);
assert.equal(first.state.account.gemPouch!.stacks.find(row=>row.itemId===firstGem)!.quantity,initialBalance-1);
assert.equal(JSON.stringify(claimed.state),initialState,'A pure operation may not mutate its input');
const getSidecar=(s:typeof state)=>((s.account.equipmentV2Hidden as {
 gemSocketState:V2GemSidecarState;
}).gemSocketState);
assert.deepEqual(getSidecar(first.state).slots,[{instanceId:itemId,stat:{gemId:firstGem,rollPercent:90}}]);
assert.equal(JSON.stringify((first.state.account.equipmentV2Hidden as {items:{exactItem:unknown}[]}).items[0].exactItem),
 frozen,'Permanent sockets must NEVER rewrite mint-time rarity, quality, affixes or empty gem slots');
const replay=simulateEquipmentV2GemInGameState(input(first.state,command('gem-place-0001',12,firstGem),13,120));
assert.equal(replay.replayed,true);
assert.strictEqual(replay.state,first.state,'Lost-response replay is read-only');
assert.deepEqual(replay.receipt,first.receipt,'No reroll after request ID replay');
assert.throws(()=>simulateEquipmentV2GemInGameState(input(first.state,
 command('gem-place-0001',12,replacementGem),13,120)),/v2_socket_request_conflict/);

const reroll=simulateEquipmentV2GemInGameState(input(first.state,command('gem-reroll-0002',13,firstGem),13,85));
assert.equal(reroll.receipt.rollPercent,90,'Identical-gem grindstone cannot reduce a good roll');
assert.equal(reroll.receipt.burnedGemId,null);
assert.ok(!reroll.state.account.gemPouch!.stacks.some(row=>row.itemId===firstGem),
 'Exactly one owned gem consumed for the reroll');
const replaced=simulateEquipmentV2GemInGameState(input(reroll.state,
 command('gem-replace-0003',14,replacementGem),14,110));
assert.equal(replaced.receipt.burnedGemId,firstGem,'Replaced gem is destroyed and never returned');
assert.equal(replaced.receipt.rollPercent,110);
assert.deepEqual(getSidecar(replaced.state).slots[0].stat,{gemId:replacementGem,rollPercent:110});
assert.ok(!replaced.state.account.gemPouch!.stacks.some(row=>row.itemId===replacementGem));
assert.equal(getSidecar(replaced.state).receipts.length,3);
const withMaterials=structuredClone(replaced.state);
withMaterials.inventory.stacks.push(...recipe.inputs.map(row=>({itemId:row.itemId,quantity:row.quantity})));
const forgedAgain=simulateEquipmentV2InGameState(forgeInput(withMaterials,{
 kind:'start',requestId:'next-forge-0001',expectedVersion:15,recipeId:recipe.id,
},15));
assert.deepEqual(getSidecar(forgedAgain.state),getSidecar(replaced.state),
 'New Forge activity must preserve immutable installed gems and history');
assert.throws(()=>simulateEquipmentV2InGameState(forgeInput(withMaterials,{
 kind:'start',requestId:'gem-replace-0003',expectedVersion:15,recipeId:recipe.id,
},15)),/v2_cross_command_request_id_conflict/);
const alteredHistory=structuredClone(replaced.state);
getSidecar(alteredHistory).receipts[2].rollPercent=80;
assert.throws(()=>simulateEquipmentV2GemInGameState(input(alteredHistory,
 command('gem-tamper-0001',15,firstGem),15,100)),/v2_gem_sidecar_state_mismatch/,
 'A saved socket may not disagree with its immutable action receipts');

assert.doesNotThrow(()=>verifyEquipmentV2GemSidecar(
 (replaced.state.account.equipmentV2Hidden as {items:any[]}).items,getSidecar(replaced.state)));
assert.throws(()=>simulateEquipmentV2GemInGameState(input(replaced.state,
 command('gem-replace-0004',15,replacementGem),15,120)),/v2_socket_gem_not_owned/,
 'No hidden socket action can mint a gem that was already consumed');

const bankFallback=structuredClone(first.state);
bankFallback.account.gemPouch!.stacks=bankFallback.account.gemPouch!.stacks.filter(row=>row.itemId!==replacementGem);
bankFallback.bank.stacks.push({itemId:replacementGem,quantity:1});
const bankChange=simulateEquipmentV2GemInGameState(input(bankFallback,
 command('gem-bank-00003',13,replacementGem),13,105));
assert.equal(bankChange.receipt.source,'bank');
assert.ok(!bankChange.state.bank.stacks.some(row=>row.itemId===replacementGem));
assert.throws(()=>simulateEquipmentV2GemInGameState(input(first.state,
 command('gem-effect-001',13,'gem:effect_momentum:g1'),13,100)),
 /v2_effect_gem_loadout_cap_not_ready/,'Effect Gems cannot bypass future combat resonance caps');
assert.throws(()=>simulateEquipmentV2GemInGameState(input(first.state,
 command('gem-claim-00001',13,firstGem),13,100)),
 /v2_cross_command_request_id_conflict/,'Forge and sockets share one request-ID namespace');
assert.throws(()=>simulateEquipmentV2GemInGameState(input(first.state,
 command('gem-stale-0001',12,firstGem),13,100)),/stale_v2_socket_version/);
assert.throws(()=>simulateEquipmentV2GemInGameState(input(first.state,
 command('gem-forged-0001',13,firstGem),13,121)),/untrusted_v2_socket_roll/);
assert.throws(()=>runEquipmentV2GemInGameState(input(claimed.state,
 command('gem-locked-0001',12,firstGem),12,90)),
 /equipment_crafting_v2_not_released/);
const corrupted=structuredClone(first.state);
(getSidecar(corrupted).slots[0].stat as {rollPercent:number}).rollPercent=999;
assert.throws(()=>simulateEquipmentV2GemInGameState(input(corrupted,
 command('gem-corrup-0001',13,firstGem),13,100)),/invalid_v2_installed_gem/);
const other=createCharacter(newGame(now),'WAYFINDER');
assert.ok(other.character);
other.character.id='gem-other-hero';
const switchable=structuredClone(first.state);
switchable.otherCharacters=[{
 character:other.character,inventory:other.inventory,overflow:other.overflow,
 activity:other.activity,skills:other.skills,quests:other.quests,
 currentRegionId:other.currentRegionId,
}];
const switched=switchAccountCharacter(switchable,'gem-other-hero',now);
assert.equal(switched.character?.id,'gem-other-hero');
assert.throws(()=>simulateEquipmentV2GemInGameState(input(switched,
 command('gem-not-owner-01',13,firstGem),13,100)),/wrong_v2_socket_owner/,
 'Other account characters may share gems but not mutate an unreleased copy owned by the original crafter');
assert.equal(owner,state.character!.id);
console.log('PASS: hidden Equipment 2.0 permanent Stat Gem one-time consumption, owner receipts, reroll, replacement, deferred effect caps and disabled runtime');
