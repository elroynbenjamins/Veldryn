/**
 * V85 hidden replay integrity regression. All rows are simulated DB results;
 * the real V70 SQL remains review-only and is NOT installed anywhere.
 *
 * Even if a future query/driver/schema returns duplicate or misclassified
 * rows, no physically unverified Party Event chest may be accepted on replay.
 */
import {
 createChestPostgresStoreV70,
 type ChestPoolV70,type ChestPhysicalPortsV70,
} from '../chest-postgres-store-v70';
import type {FrozenChestReceiptV69} from '../chest-reward-settlement-v69';

function check(value:unknown,label:string):asserts value{
 if(!value)throw Error('chest_v85_test:'+label);
}
const account='11111111-1111-4111-8111-111111111111';
const strayItem='22222222-2222-4222-8222-222222222222';
const source='party-event:'+Date.UTC(2026,10,16)+':'+account+
 ':participation';
const receipt:FrozenChestReceiptV69={
 rulesVersion:'chest-settlement-v69',accountId:account,sourceKey:source,
 proofVersion:'party-event-proof-v61',committed:true,
 recipientCharacterId:null,equipmentDeliveryMode:null,
 tableId:'party_event_chest',tableVersion:'party_event_v51_broken_caravan_participation_standard',
 guaranteed:[{id:'party_sigils',quantity:8},{id:'gold',quantity:200}],
 groups:[{groupId:'materials',type:'material',chanceBps:10000,
  hit:true,entryId:'GEM_DUST',quantity:3}],
 drops:[{groupId:'materials',type:'material',entryId:'GEM_DUST',quantity:3}],
};
const leg=(kind:string,ordinal:number,rewardId:string,quantity:number)=>({
 source_key:source,account_id:account,leg_kind:kind,ordinal,
 reward_id:rewardId,quantity,grant_id:'v85:'+kind+':'+ordinal,
 item_instance_id:null as string|null,
});
const canonical=[
 leg('guarantee',0,'party_sigils',8),
 leg('guarantee',1,'gold',200),
 leg('drop',0,'GEM_DUST',3),
 leg('inbox',0,'inbox:'+source,1),
];
type Mode='valid'|'duplicate_missing'|'material_as_equipment'|
 'guarantee_as_equipment'|'inbox_as_equipment'|'missing'|'quantity';
let mode:Mode='valid';
let physicalChecks=0,connections=0,releases=0;
const rows=()=>{
 const copy=canonical.map(x=>({...x}));
 switch(mode){
 case 'duplicate_missing':
  // Correct row count, but second guaranteed reward never existed.
  copy[1]={...copy[0]!};break;
 case 'material_as_equipment':
  copy[2]!.item_instance_id=strayItem;break;
 case 'guarantee_as_equipment':
  copy[0]!.item_instance_id=strayItem;break;
 case 'inbox_as_equipment':
  copy[3]!.item_instance_id=strayItem;break;
 case 'missing':
  copy.pop();break;
 case 'quantity':
  copy[1]!.quantity++;break;
 }
 return copy;
};
const pool:ChestPoolV70={connect:async()=>{
 connections++;
 return {
  async query<T extends Record<string,unknown>=Record<string,unknown>>(
   sql:string,_params?:readonly unknown[],
  ):Promise<{rows:T[]}>{
   let result:Record<string,unknown>[]=[];
   if(sql.startsWith('select account_id::text as account_id'))
    result=[{account_id:account}];
   else if(sql.startsWith('select receipt from private.chest_reward_receipts_v70'))
    result=[{receipt}];
   else if(sql.includes('from private.chest_reward_grant_legs_v70'))
    result=rows();
   else if(!sql.startsWith('begin isolation level')&&
    !sql.startsWith('set local')&&!sql.startsWith('insert into private.chest_account_fence_v70')&&
    sql!=='commit'&&sql!=='rollback')
    throw Error('chest_v85_unexpected_sql:'+sql);
   return {rows:result as T[]};
  },
  release(){releases++},
 };
}};
const ports:ChestPhysicalPortsV70={
 readCanonicalSource:async()=>{throw Error('v85_read_source_on_replay')},
 readAccountOwnedDrops:async()=>{throw Error('v85_read_inventory_on_replay')},
 isOwnedCharacter:async()=>{throw Error('v85_reverify_character_on_replay')},
 readApprovedEquipmentContext:async()=>{throw Error('v85_gear_not_issuable')},
 creditGuaranteed:async()=>{throw Error('v85_double_credit')},
 grantDrop:async()=>{throw Error('v85_double_drop')},
 grantInbox:async()=>{throw Error('v85_double_inbox')},
 verifyPhysical:async()=>{physicalChecks++;return true},
};
async function run(){
 const store=createChestPostgresStoreV70(pool,ports,true);
 const verify=()=>store.withLockedAccountSource(account,source,async tx=>{
  const frozen=await tx.readCommittedReceipt(source);
  check(frozen!==null,'read_existing_frozen_receipt');
  return tx.verifyExactlyGranted(frozen);
 });
 check(await verify(),'valid_replay_survives');
 check(physicalChecks===1,'valid_replay_reaches_physical_writer');
 for(const bad of ['duplicate_missing','material_as_equipment',
  'guarantee_as_equipment','inbox_as_equipment','missing','quantity'] as const){
  mode=bad;
  check(!await verify(),'reject_'+bad);
  check(physicalChecks===1,'reject_before_physical_port_'+bad);
 }
 check(releases===connections&&connections===7,
  'all_replay_paths_release_transaction');
 console.log('CHEST_V85_REPLAY_GUARD_OK: duplicate/missing legs, phantom equipment custody, truncated grants and forged quantity reject before physical port; valid legacy replay retained');
}
run().catch(error=>{console.error(error);throw error});
