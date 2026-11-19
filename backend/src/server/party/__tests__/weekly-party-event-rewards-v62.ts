import {
 PARTY_EVENT_REWARD_READ_V62_RELEASED,buildPrivatePartyRewardReadV62,
} from '../weekly-party-event-rewards-v62';
import type {PrivatePartyRewardProofV61} from '../weekly-party-event-proof-v61';
import type {PartyEventRewardReceiptV60} from '../weekly-party-event-claim-v60';

function check(value:unknown,label:string):asserts value{
 if(!value)throw Error('party_event_read_v62_test:'+label);
}
function rejects(fn:()=>unknown,code:string){
 let failed=false;try{fn()}catch(error){failed=String(error).includes(code)}
 check(failed,'reject_'+code);
}
const accountId='11111111-1111-4111-8111-111111111111';
const partyId='22222222-2222-4222-8222-222222222222';
const characterId='33333333-3333-4333-8333-333333333333';
const sourceId='44444444-4444-4444-8444-444444444444';
const at=Date.UTC(2026,10,16);
const identity={partyId,accountId,eventStartsAtUtcMs:at};
const proof:PrivatePartyRewardProofV61={
 source:'private_party_event_settlement_join_v61',
 week:{partyId,eventStartsAtUtcMs:at,eventEndsAtUtcMs:at+604800000,
  settledAtUtcMs:at+604800000+3600000,status:'settled',
  family:'nightfall_hunt',difficulty:'heroic'},
 roster:{...identity,rosterSize:2,frozenCharacterId:characterId},
 activity:{...identity,activityPoints:19,sourceVersion:'party_event_member_progress_v14'},
 preparation:{...identity,committedDonationId:sourceId,
  optionalSupplyGoalReceiptId:sourceId,optionalGoalFrozen:true},
 finale:{partyId,eventStartsAtUtcMs:at,canonicalFinaleReceiptId:sourceId,
  serverVerifiedVictory:true},
 tier:{...identity,eligibleGearTier:3,sourceVersion:'server_level_snapshot_v2'},
};
const timestamp=proof.week.settledAtUtcMs+2000;
const data={trustedAccountId:accountId,proof,sourceReceipts:[],
 ownedPieceIds:['PE_MOONFANG_PURSUIT_BOOTS'],
 trustedSigilsBalance:34,serverTimeUtcMs:timestamp};
check(!PARTY_EVENT_REWARD_READ_V62_RELEASED,'release_gate_off');
const initial=buildPrivatePartyRewardReadV62(data);
check(initial.chests.map(x=>x.state).join(',')==='earned,earned,earned',
 'three_earned_unclaimed');
check(initial.chests.map(x=>x.gearChanceBps).join(',')==='1600,2000,2900',
 'heroic_gear_odds_exact');
check(initial.chests.every(x=>!x.canClaim&&!x.canOpen)&&
 initial.exchangeAvailable===false&&initial.settlementClaimAvailable===false&&
 initial.previewOnly===true&&initial.rewardsGrantedByThisRead===0,
 'read_cannot_pay');
check(initial.sets.length===2&&initial.sets[0]!.collected===1&&
 initial.sets[1]!.collected===0&&initial.partySigilsBalance===34,
 'server_owned_collection_and_existing_wallet');
const participation:PartyEventRewardReceiptV60={
 sourceKey:'party-event:'+at+':'+accountId+':participation',
 accountId,weekStartMs:at,origin:'chest',chestKind:'participation',
 pieceId:null,frozenGear:null,partySigilsDelta:8,gold:200,gemDust:2,
 companionEssence:4,rulesVersion:'party-event-reward-v60',
};
const after=buildPrivatePartyRewardReadV62({...data,sourceReceipts:[participation]});
check(after.chests.map(x=>x.state).join(',')==='claimed,earned,earned',
 'claimed_not_double_claimable');
rejects(()=>buildPrivatePartyRewardReadV62({
 ...data,sourceReceipts:[participation,participation]}),
 'invalid_claim_receipt');
rejects(()=>buildPrivatePartyRewardReadV62({
 ...data,sourceReceipts:[{...participation,accountId:partyId}]}),
 'invalid_claim_receipt');
rejects(()=>buildPrivatePartyRewardReadV62({
 ...data,sourceReceipts:[{...participation,partySigilsDelta:80}]}),
 'invalid_claim_receipt');
rejects(()=>buildPrivatePartyRewardReadV62({
 ...data,ownedPieceIds:[data.ownedPieceIds[0]!,data.ownedPieceIds[0]!]}),
 'invalid_collection');
rejects(()=>buildPrivatePartyRewardReadV62({
 ...data,ownedPieceIds:['UNKNOWN_EQ2_EVENT_PIECE']}),'invalid_collection');
rejects(()=>buildPrivatePartyRewardReadV62({
 ...data,trustedAccountId:partyId}),'cross_source_identity');
rejects(()=>buildPrivatePartyRewardReadV62({
 ...data,trustedSigilsBalance:-1}),'invalid_authoritative_read');
rejects(()=>buildPrivatePartyRewardReadV62({
 ...data,proof:{...proof,week:{...proof.week,status:'active' as 'settled'}}}),
 'unverified_settlement_sources');
console.log('PARTY_EVENT_REWARD_READ_V62_OK: one owner/event, 3 accurate difficulty odds, receipt-safe claimed state, 3+2 pieces, disabled claims');
