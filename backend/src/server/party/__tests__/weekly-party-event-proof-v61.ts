import {
 PARTY_EVENT_PROOF_V61_RELEASED,deriveVerifiedPartyChestEvidenceV61,
 type PrivatePartyRewardProofV61,
} from '../weekly-party-event-proof-v61';
import {previewVerifiedPartyChestsV51} from '../weekly-party-event-chests-v51';

const assert=(ok:unknown,label:string)=>{if(!ok)throw Error('party_event_v61_test:'+label)};
const expectThrow=(fn:()=>unknown,msg:string)=>{
 let bad=false;try{fn()}catch(error){bad=String(error).includes(msg)}
 assert(bad,'throws_'+msg);
};
const accountId='11111111-1111-4111-8111-111111111111';
const partyId='22222222-2222-4222-8222-222222222222';
const characterId='33333333-3333-4333-8333-333333333333';
const receiptId='44444444-4444-4444-8444-444444444444';
const week=Date.UTC(2026,10,16);
const id={partyId,accountId,eventStartsAtUtcMs:week};
const proof:PrivatePartyRewardProofV61={
 source:'private_party_event_settlement_join_v61',
 week:{partyId,eventStartsAtUtcMs:week,eventEndsAtUtcMs:week+604800000,
  settledAtUtcMs:week+604800000+3600000,status:'settled',family:'broken_wards',
  difficulty:'veteran'},
 roster:{...id,rosterSize:4,frozenCharacterId:characterId},
 activity:{...id,activityPoints:20,sourceVersion:'party_event_member_progress_v14'},
 preparation:{...id,committedDonationId:receiptId,
  optionalSupplyGoalReceiptId:receiptId,optionalGoalFrozen:true},
 finale:{partyId,eventStartsAtUtcMs:week,canonicalFinaleReceiptId:receiptId,
  serverVerifiedVictory:true},
 tier:{...id,eligibleGearTier:3,sourceVersion:'server_level_snapshot_v2'},
};
assert(PARTY_EVENT_PROOF_V61_RELEASED===false,'disabled');
const resolved=deriveVerifiedPartyChestEvidenceV61(proof,accountId);
assert(resolved.personalPoints===20&&resolved.eligibleGearTier===3,'server_derived');
assert(previewVerifiedPartyChestsV51(resolved).length===3,'all_3_when_verified');
assert(previewVerifiedPartyChestsV51(deriveVerifiedPartyChestEvidenceV61({
 ...proof,finale:null,
},accountId)).length===2,'no_finale_receipt_no_victory');
assert(previewVerifiedPartyChestsV51(deriveVerifiedPartyChestEvidenceV61({
 ...proof,preparation:null,
},accountId)).length===2,'no_prep_receipt_no_prep_chest');
assert(previewVerifiedPartyChestsV51(deriveVerifiedPartyChestEvidenceV61({
 ...proof,activity:{...proof.activity,activityPoints:14},
},accountId)).length===0,'v14_floor');
const clone=(changes:Partial<PrivatePartyRewardProofV61>)=>
 deriveVerifiedPartyChestEvidenceV61({...proof,...changes},accountId);
for(const invalid of [
 {...proof.week,status:'active' as 'settled'},
 {...proof.week,settledAtUtcMs:week+604800000},
 {...proof.week,eventEndsAtUtcMs:week+day()},
 {...proof.week,eventStartsAtUtcMs:week+86400000},
]){
 expectThrow(()=>clone({week:invalid}),'unverified_settlement_sources');
}
function day(){return 86400000;}
expectThrow(()=>deriveVerifiedPartyChestEvidenceV61(proof,'55555555-5555-4555-8555-555555555555'),
 'cross_source_identity');
expectThrow(()=>clone({activity:{...proof.activity,partyId:characterId}}),
 'cross_source_identity');
expectThrow(()=>clone({roster:{...proof.roster,accountId:characterId}}),
 'cross_source_identity');
expectThrow(()=>clone({tier:{...proof.tier,sourceVersion:'client_level' as 'server_level_snapshot_v2'}}),
 'unverified_settlement_sources');
expectThrow(()=>clone({activity:{...proof.activity,activityPoints:41}}),
 'unverified_settlement_sources');
expectThrow(()=>clone({preparation:{...proof.preparation!,committedDonationId:'not-a-receipt'}}),
 'invalid_preparation_proof');
expectThrow(()=>clone({preparation:{...proof.preparation!,optionalGoalFrozen:true,
 optionalSupplyGoalReceiptId:null}}),'invalid_preparation_proof');
expectThrow(()=>clone({finale:{...proof.finale!,partyId:characterId}}),
 'cross_party_evidence');
console.log('PARTY_EVENT_PROOF_V61_OK: settled week, canonical account/party, V14 EP, frozen preparation and finale receipts, server tier, all three source caps');
