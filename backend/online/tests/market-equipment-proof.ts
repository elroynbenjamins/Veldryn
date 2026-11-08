import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {draftCraftedGearInstance} from '../../../apps/mobile/src/core/crafted-gear-instances';
import {V33_EQUIPMENT_RECIPES} from '../../../apps/mobile/src/content/equipment-recipes-v33';
import {itemDef} from '../../../apps/mobile/src/content/items';
import type {CraftedGearInstance,GameState} from '../../../apps/mobile/src/core/types';
import {
  inspectExactMarketGearV7,inspectMarketGearDeliveryV7,
  MARKET_EQUIPMENT_ESCROW_RELEASED_V7,
} from '../market-equipment-proof';

const base=createCharacter(newGame(0),'BASTION','Exact Equipment Market');
const gearId=V33_EQUIPMENT_RECIPES.find(x=>x.classId==='BASTION'&&x.v33EquipmentTier==='T1')!.output.itemId;
const statGem='gem:stat_might:g2',effectGem='gem:effect_momentum:g1';
assert.equal(itemDef(statGem).type,'gem');
assert.equal(itemDef(effectGem).type,'gem');
const seed=draftCraftedGearInstance({
  itemId:gearId,ownerCharacterId:base.character!.id,
  jobId:'market-v7-exact',createdAtMs:1234,roll:.012,
});
const receipt:CraftedGearInstance={
  ...seed,rarity:'mythic',quality:93,statRoll:.732,
  enhancement:{
    rank:3,failures:2,statGemId:statGem,effectGemId:effectGem,
    gemIds:[statGem,effectGem],
  },
};
const state:GameState={
  ...base,
  inventory:{...base.inventory,stacks:[
    {itemId:gearId,quantity:1,instanceId:receipt.id},
    {itemId:'COPPER_ORE',quantity:8},
  ]},
  account:{...base.account,longTermAccountScopeId:'market-proof-owner',
    craftedGearInstances:[receipt]},
};
const original=JSON.stringify(state);
assert.equal(MARKET_EQUIPMENT_ESCROW_RELEASED_V7,false);
const inspected=inspectExactMarketGearV7(state,'market-proof-owner',11,receipt.id);
assert.equal(inspected.canEscrowNow,false,'even an audited copy cannot transact yet');
assert.deepEqual(inspected.problems,['transactional_equipment_bridge_not_released']);
const envelope=inspected.envelope!;
assert(envelope);
assert.equal(envelope.sourceLocation,'inventory');
assert.equal(envelope.sourceCharacterId,base.character!.id);
assert.equal(envelope.sourceRevision,11);
assert.equal(envelope.sourceIndex,0);
assert.equal(envelope.instanceId,receipt.id);
assert.deepEqual(envelope.exactReceipt,receipt,'preserve full per-copy receipt, sockets and upgrades');
assert.notStrictEqual(envelope.exactReceipt,receipt,'no live reference shared with source');
assert.notStrictEqual(envelope.exactReceipt.enhancement,receipt.enhancement);

function denied(s:GameState,reason:string,owner='market-proof-owner',rev=11){
 const r=inspectExactMarketGearV7(s,owner,rev,receipt.id);
 assert.equal(r.envelope,null,'reject unverified exact receipt');
 assert(r.problems.includes(reason),JSON.stringify(r.problems));
}
denied(state,'unverified_account_or_revision','foreign-account');
denied(state,'unverified_account_or_revision','market-proof-owner',-1);
denied({...state,account:{...state.account,craftedGearInstances:[]}},'exact_receipt_missing_or_duplicate');
denied({...state,account:{...state.account,craftedGearInstances:[receipt,receipt]}},
  'exact_receipt_missing_or_duplicate');
denied({...state,bank:{...state.bank,stacks:[
  {itemId:gearId,quantity:1,instanceId:receipt.id},
]}},'equipment_ownership_audit_not_clean');
denied({...state,inventory:{...state.inventory,stacks:[
  {itemId:gearId,quantity:1},
]}},'equipment_ownership_audit_not_clean');
denied({...state,account:{...state.account,craftedGearInstances:[
  {...receipt,quality:undefined},
]}},'unverified_exact_forge_receipt');
denied({...state,account:{...state.account,craftedGearInstances:[
  {...receipt,enhancement:{...receipt.enhancement,gemIds:[statGem]}},
]}},'socket_reconciliation_required');
denied({...state,account:{...state.account,craftedGearInstances:[
  {...receipt,enhancement:{...receipt.enhancement,statGemId:'fake:gem'}},
]}},'socket_reconciliation_required');
denied({...state,account:{...state.account,craftedGearInstances:[
  {...receipt,enhancement:{...receipt.enhancement,rank:50}},
]}},'invalid_enhancement_or_socket_data');
denied({...state,account:{...state.account,craftedGearInstances:[
  {...receipt,locked:true},
]}},'locked_equipment');
denied({...state,settings:{...state.settings,lockedItemIds:[gearId]}},'locked_equipment');
denied({...state,settings:{...state.settings,favoriteItemIds:[gearId]}},'favorite_equipment');
denied({...state,character:{...state.character!,
  gearEnhancements:{[gearId]:{rank:2,failures:0,gemIds:[]}},
}},'legacy_item_level_upgrades_unreconciled');
const slot=itemDef(gearId).slot!;
denied({...state,character:{...state.character!,savedLoadouts:[{
  id:'market-save',slotIndex:0,name:'My protected gear',
  classId:'BASTION',equipment:{[slot]:gearId},
  equipmentInstanceIds:{[slot]:receipt.id},
  createdAtMs:0,updatedAtMs:0,
}]}},'saved_loadout_references_copy');

const equipped:GameState={...state,inventory:{...state.inventory,stacks:[]},
  character:{...state.character!,
    equipment:{...state.character!.equipment,[slot]:gearId},
    equipmentInstanceIds:{[slot]:receipt.id}}};
denied(equipped,'equipped_or_overflow_copy_not_tradable');

const bank:GameState={...state,inventory:{...state.inventory,stacks:[]},
  bank:{...state.bank,stacks:[{itemId:gearId,quantity:1,instanceId:receipt.id}]}};
const bankProof=inspectExactMarketGearV7(bank,'market-proof-owner',11,receipt.id).envelope!;
assert.equal(bankProof.sourceLocation,'bank');
assert.equal(bankProof.sourceCharacterId,null);
assert.equal(bankProof.sourceIndex,0);

const buyerBase=createCharacter(newGame(0),'BASTION','Recipient');
const recipient:GameState={...buyerBase,
  account:{...buyerBase.account,longTermAccountScopeId:'market-proof-buyer'}};
const preview=inspectMarketGearDeliveryV7(recipient,'market-proof-buyer',
  envelope,recipient.character!.id,'equipment_pouch');
assert.equal(preview.canDeliverNow,false);
assert.deepEqual(preview.problems,['transactional_equipment_delivery_not_released']);
const notOwner=inspectMarketGearDeliveryV7(recipient,'attacker',
  envelope,recipient.character!.id,'inventory');
assert(notOwner.problems.includes('buyer_account_unverified'));
const wrongCharacter=inspectMarketGearDeliveryV7(recipient,'market-proof-buyer',
  envelope,'other-players-character','equipment_pouch');
assert(wrongCharacter.problems.includes('destination_character_not_owned'));
const collision=inspectMarketGearDeliveryV7({...recipient,
  account:{...recipient.account,craftedGearInstances:[receipt]},
},'market-proof-buyer',envelope,recipient.character!.id,'inventory');
assert(collision.problems.includes('duplicate_instance_id_in_destination'));
const full=inspectMarketGearDeliveryV7({...recipient,
  character:{...recipient.character!,equipmentPouch:{
    capacity:1,stacks:[{itemId:'COPPER_ORE',quantity:1}],
  }},
},'market-proof-buyer',envelope,recipient.character!.id,'equipment_pouch');
assert(full.problems.includes('destination_storage_full_or_unverified'));
assert.equal(JSON.stringify(state),original,'inspection must not mutate saved equipment');
console.log('PASS: hidden equipment proof preserves exact rarity/quality/socket/upgrade copy, blocks legacy/lock/loadouts and never transfers');
