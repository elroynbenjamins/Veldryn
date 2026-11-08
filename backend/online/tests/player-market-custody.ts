import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {draftCraftedGearInstance} from '../../../apps/mobile/src/core/crafted-gear-instances';
import {V33_EQUIPMENT_RECIPES} from '../../../apps/mobile/src/content/equipment-recipes-v33';
import {itemDef} from '../../../apps/mobile/src/content/items';
import type {GameState} from '../../../apps/mobile/src/core/types';
import {
  inspectPlayerMarketCustodySnapshotV1,
  MARKET_SNAPSHOT_ESCROW_BRIDGE_READY_V1,
} from '../market-custody-readiness';

const base=createCharacter(newGame(0),'BASTION','Market Custody Test');
const gearId=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='BASTION'&&row.v33EquipmentTier==='T1')!.output.itemId;
const record=draftCraftedGearInstance({
  itemId:gearId,ownerCharacterId:base.character!.id,jobId:'custody-unique-1',
  createdAtMs:1234,roll:.012,
});
const inactiveCharacter={...base.character!,id:'inactive-character',
  equipmentPouch:{capacity:30,stacks:[]}};
const state:GameState={
  ...base,
  inventory:{...base.inventory,stacks:[
    {itemId:'COPPER_ORE',quantity:50},
    {itemId:gearId,quantity:1,instanceId:record.id},
  ]},
  bank:{...base.bank,stacks:[{itemId:'GREENWOOD_LOG',quantity:25}]},
  account:{...base.account,longTermAccountScopeId:'custody-test-account',
    craftedGearInstances:[record]},
  otherCharacters:[{
    character:inactiveCharacter,
    inventory:{capacity:30,stacks:[{itemId:'COPPER_ORE',quantity:8}]},
    overflow:{stacks:[],expiresAtMs:null},
    activity:null,skills:base.skills,quests:base.quests,
    currentRegionId:base.currentRegionId,
  }],
};
const original=JSON.stringify(state);
assert.equal(MARKET_SNAPSHOT_ESCROW_BRIDGE_READY_V1,false);
const missing=inspectPlayerMarketCustodySnapshotV1(state,'different-account',5);
assert.equal(missing.canEscrowNow,false);
assert.equal(missing.rows.length,0,'A foreign account cannot inspect a snapshot');
assert.deepEqual(missing.ownershipProblems,['account_or_revision_unverified']);
const negativeRevision=inspectPlayerMarketCustodySnapshotV1(state,'custody-test-account',-1);
assert.equal(negativeRevision.rows.length,0,'Negative revisions must fail closed');

const actual=inspectPlayerMarketCustodySnapshotV1(state,'custody-test-account',5);
assert.equal(actual.accountVerified,true);
assert.equal(actual.sourceBridgeReady,false);
assert.equal(actual.canEscrowNow,false);
assert.equal(actual.rows.length,4,'Inspect both character inventories and shared Bank only');
assert(actual.rows.every(row=>row.canEscrowNow===false
  &&row.problems.includes('snapshot_bridge_not_implemented')
  &&row.problems.includes('binding_status_unverified')));
assert.deepEqual(actual.rows.map(row=>row.sourceRevision),[5,5,5,5]);
assert.equal(actual.rows.filter(row=>row.itemId==='COPPER_ORE').length,2,
  'Identical item IDs from different characters must not merge');
assert.equal(new Set(actual.rows.map(row=>row.sourceLocator)).size,4,
  'Storage source locators must be unique within one account revision');
const forged=actual.rows.find(row=>row.exactInstanceId===record.id)!;
assert.equal(forged.assetKind,'equipment');
assert.equal(forged.quantity,1);
assert.equal(forged.immutableAttributes.rarity,record.rarity);
assert.equal(forged.immutableAttributes.quality,record.quality);
assert.deepEqual(forged.immutableAttributes.enhancement,record.enhancement);
assert(!forged.problems.includes('equipment_ownership_conflict'));
const bank=actual.rows.find(row=>row.sourceLocation==='bank')!;
assert.equal(bank.sourceCharacterId,undefined);
assert.equal(bank.quantity,25);

const gearSlot=itemDef(gearId).slot!;
const saved:GameState={...state,character:{...state.character!,savedLoadouts:[{
  id:'market-loadout',slotIndex:0,name:'Protected',classId:'BASTION',
  equipment:{[gearSlot]:gearId},
  equipmentInstanceIds:{[gearSlot]:record.id},
  createdAtMs:0,updatedAtMs:0,
}]}};
const reserved=inspectPlayerMarketCustodySnapshotV1(saved,'custody-test-account',5);
assert(reserved.rows.find(row=>row.exactInstanceId===record.id)
  ?.problems.includes('saved_loadout_reserved'),
  'Server inspection must protect exact gear referenced by saved loadouts');

const duplicate:GameState={...state,bank:{...state.bank,stacks:[
  {itemId:gearId,quantity:1,instanceId:record.id},
]}};
const conflict=inspectPlayerMarketCustodySnapshotV1(duplicate,'custody-test-account',5);
assert(conflict.ownershipProblems.some(reason=>reason.includes('Duplicate physical copy marker')));
assert(conflict.rows.find(row=>row.exactInstanceId===record.id)?.problems.includes('equipment_ownership_conflict'));

const legacy:GameState={...state,inventory:{...state.inventory,stacks:[
  {itemId:'COPPER_ORE',quantity:50},{itemId:gearId,quantity:1},
]}};
const unverified=inspectPlayerMarketCustodySnapshotV1(legacy,'custody-test-account',5);
assert(unverified.rows.some(row=>row.itemId===gearId
  &&row.problems.includes('legacy_or_invalid_equipment_identity')));
assert.equal(JSON.stringify(state),original,'The audit must not mutate game state');
console.log('PASS: hidden server custody inspection is revision-bound, read-only and never escrow-authorizing');
