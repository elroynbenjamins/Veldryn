import {
 PARTY_EVENT_CHEST_SOURCE_V77_RELEASED,
 resolveTrustedPartyChestSourceV77,
} from '../weekly-party-event-chest-source-v77';
import {previewVerifiedPartyChestsV51} from '../weekly-party-event-chests-v51';
import {deriveVerifiedPartyChestEvidenceV61,
 type PrivatePartyRewardProofV61} from '../weekly-party-event-proof-v61';
import {createChestRewardSettlementV69,
 type FrozenChestReceiptV69,type ChestGrantStoreV69,
 type ChestGrantTransactionV69} from '../../loot/chest-reward-settlement-v69';

function ok(value:unknown,label:string):asserts value{
 if(!value)throw Error('party_event_v77_test:'+label);
}
function rejects(fn:()=>unknown,part:string){
 let hit=false;try{fn()}catch(e){hit=String(e).includes(part)}
 ok(hit,'reject_'+part);
}
const account='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const party='33333333-3333-4333-8333-333333333333';
const character='44444444-4444-4444-8444-444444444444';
const proofId='55555555-5555-4555-8555-555555555555';
const week=Date.UTC(2026,10,16);
const identity={partyId:party,accountId:account,eventStartsAtUtcMs:week};
const proof:PrivatePartyRewardProofV61={
 source:'private_party_event_settlement_join_v61',
 week:{partyId:party,eventStartsAtUtcMs:week,
  eventEndsAtUtcMs:week+604800000,settledAtUtcMs:week+608400000,
  status:'settled',family:'broken_caravan',difficulty:'standard'},
 roster:{...identity,rosterSize:4,frozenCharacterId:character},
 activity:{...identity,activityPoints:20,
  sourceVersion:'party_event_member_progress_v14'},
 preparation:{...identity,committedDonationId:proofId,
  optionalSupplyGoalReceiptId:proofId,optionalGoalFrozen:true},
 finale:{partyId:party,eventStartsAtUtcMs:week,
  canonicalFinaleReceiptId:proofId,serverVerifiedVictory:true},
 tier:{...identity,eligibleGearTier:2,
  sourceVersion:'server_level_snapshot_v2'},
};
const chestKey=(kind:string)=>
 'party-event:'+week+':'+account+':'+kind;
const source=(key:string,p:PrivatePartyRewardProofV61=proof)=>
 resolveTrustedPartyChestSourceV77({
  authenticatedAccountId:account,sourceKey:key,proof:p,
 });
ok(!PARTY_EVENT_CHEST_SOURCE_V77_RELEASED,'release_off');
for(const [kind,sigils,chance] of [
 ['participation',8,1200],['preparation',10,1600],['finale',16,2400],
] as const){
 const s=source(chestKey(kind));
 ok(s.earned&&s.recipientCharacterId===character&&
  s.equipmentDeliveryMode==='character'&&
  s.proofVersion==='party-event-proof-v61'&&
  s.lootTable.tableId==='party_event_chest'&&
  s.lootTable.groups[0]?.chanceBps===chance&&
  s.lootTable.guarantees[0]?.quantity===sigils,
  'canonical_kind_'+kind);
}
rejects(()=>source(chestKey('exchange')),'unearned_or_foreign_chest');
rejects(()=>source(chestKey('participation').replace(account,other)),
 'unearned_or_foreign_chest');
rejects(()=>resolveTrustedPartyChestSourceV77({
 authenticatedAccountId:other,sourceKey:chestKey('participation'),proof,
}),'cross_source_identity');
rejects(()=>source('party-event:'+(week+604800000)+':'+account+':participation'),
 'unearned_or_foreign_chest');
rejects(()=>source(chestKey('preparation'),{...proof,preparation:null}),
 'unearned_or_foreign_chest');
rejects(()=>source(chestKey('finale'),{...proof,finale:null}),
 'unearned_or_foreign_chest');
rejects(()=>source(chestKey('finale'),{...proof,
 finale:{...proof.finale!,serverVerifiedVictory:false}}),
 'unearned_or_foreign_chest');
rejects(()=>source(chestKey('participation'),{...proof,
 activity:{...proof.activity,activityPoints:14}}),
 'unearned_or_foreign_chest');
rejects(()=>source(chestKey('participation'),{...proof,
 roster:{...proof.roster,accountId:other}}),'cross_source_identity');
rejects(()=>source(chestKey('participation'),{...proof,
 tier:{...proof.tier,sourceVersion:'client' as 'server_level_snapshot_v2'}}),
 'unverified_settlement_sources');
ok(previewVerifiedPartyChestsV51(
 deriveVerifiedPartyChestEvidenceV61(proof,account)).length===3,
 'three_preview_keys_match_canonical_receipts');

// Exercise an actual V69 opening with a V77 proof. All gear must miss to
// prove the real-world 88%+ empty equipment roll can still credit guarantees.
async function run(){
 const key=chestKey('participation');
 const trusted=source(key);
 const noGear={...trusted,lootTable:{
  ...trusted.lootTable,
  tableId:'test_no_gear_chest',version:'qa_zero_equipment_v1',
  groups:trusted.lootTable.groups.map(group=>({...group,chanceBps:0})),
 }};
 let saved:FrozenChestReceiptV69|null=null;
 const store:ChestGrantStoreV69={
  async withLockedAccountSource<T>(
   _owner:string,_key:string,
   work:(tx:ChestGrantTransactionV69)=>Promise<T>,
  ):Promise<T>{
   const tx={
    readCommittedReceipt:async()=>saved,
    readTrustedSource:async()=>noGear,
    readOwnedDropIds:async()=>[],
    verifyRecipientCharacter:async(owner:string,id:string)=>
     owner===account&&id===character,
    insertFrozenReceipt:async(receipt:FrozenChestReceiptV69)=>{saved=receipt},
    creditGuaranteed:async()=>{},
    grantDrop:async()=>{throw Error('unexpected_equipment_mint')},
    grantInbox:async()=>{},
    verifyExactlyGranted:async()=>true,
   };
   return work(tx);
  },
 };
 const open=createChestRewardSettlementV69(store,{
  secret:new Uint8Array(32).fill(23),
 },true);
 const first=await open({authenticatedAccountId:account,sourceKey:key});
 ok(!first.replayed&&first.receipt.drops.length===0&&
  first.receipt.equipmentDeliveryMode===null&&
  first.receipt.recipientCharacterId===null&&
  first.receipt.guaranteed.length===4,
  'miss_freezes_null_custody_and_all_four_guarantees');
 const replay=await open({authenticatedAccountId:account,sourceKey:key});
 ok(replay.replayed&&replay.receipt===saved,
  'replay_does_not_reroll_or_redirect');
 console.log('PARTY_EVENT_CHEST_SOURCE_V77_OK: 3 canonical sources, cross-account/week/proof denials, gear-miss settlement and replay');
}
run().catch(e=>{console.error(e);throw e});
