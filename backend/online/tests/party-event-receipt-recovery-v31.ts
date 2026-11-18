import {
 PARTY_EVENT_RECEIPT_RECOVERY_V31_RELEASED,
 PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31,
 validatePrivatePartyEventReceiptRecoveryV31,
 inspectPrivatePartyEventReceiptV31,
 retryPrivatePartyEventClaimV31,
} from '../party-event-receipt-recovery-v31';

const account='11111111-1111-4111-8111-111111111111';
const offer='33333333-3333-4333-8333-333333333333';
const character='22222222-2222-4222-8222-222222222222';
const receipt='66666666-6666-4666-8666-666666666666';
const inbox='77777777-7777-4777-8777-777777777777';
const request='party-v31-recovery-0001';
const date='2026-11-01T00:00:00Z';
function yes(v:unknown,m:string):asserts v{if(!v)throw Error('party_v31_test_'+m);}
function deny(fn:()=>unknown,m:string){
 try{fn();throw Error('unexpected_success');}
 catch(e){yes(String(e).includes(m),'expected_'+m+'_got_'+String(e));}
}
async function denyAsync(fn:()=>Promise<unknown>,m:string){
 try{await fn();throw Error('unexpected_success');}
 catch(e){yes(String(e).includes(m),'expected_'+m+'_got_'+String(e));}
}
function record(){return {
 receiptId:receipt,inboxId:inbox,accountId:account,offerId:offer,
 characterId:character,eventStartsAt:date,requestId:request,
 receiptStatus:'paid',rewardHash:'a'.repeat(64),stateAfterHash:'b'.repeat(64),
 inboxRecordId:inbox,inboxReceiptId:receipt,
 inboxAccountId:account,inboxOfferId:offer,inboxCharacterId:character,
 inboxEventStartsAt:'2026-11-01T01:00:00+01:00',
 inboxRewardHash:'a'.repeat(64),inboxDeliveryState:'delivered',
};}
function snapshot(records:unknown[]=[]){return {
 schema:'party-event-receipt-recovery-v31',accountId:account,offerId:offer,
 records,
};}
const verify=(s:unknown)=>validatePrivatePartyEventReceiptRecoveryV31({
 trustedAccountId:account,offerId:offer,requestId:request,recovery:s,
});
async function test(){
 yes(PARTY_EVENT_RECEIPT_RECOVERY_V31_RELEASED===false,'release_off');
 yes(PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31.includes(
  'r.account_id=$1::uuid')&&PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31.includes(
  'r.offer_id=$2::uuid or r.request_id=$3::text')
  &&!/\b(insert|update|delete)\s+(into|from|private\.)/i.test(
   PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31),'only_scoped_read_sql');
 const empty=verify(snapshot());
 yes(empty.status==='not_recorded'&&empty.receiptId===null
  &&!empty.retryAuthorized&&!empty.clientSuccessAllowed,
  'missing_receipt_never_authorizes_retry');
 const paired=verify(snapshot([record()]));
 yes(paired.status==='paired_receipt_present'&&paired.receiptId===receipt
  &&!paired.clientSuccessAllowed&&!paired.economyIndependentlyVerified
  &&!paired.payoutWriterReleased,'paired_is_not_proven_payment');
 deny(()=>verify(snapshot([record(),record()])),'ambiguous_receipt_candidates');
 deny(()=>verify({...snapshot(),accountId:character}),'snapshot_invalid');
 deny(()=>verify(snapshot([{...record(),accountId:character}])),
  'receipt_identity_invalid');
 deny(()=>verify(snapshot([{...record(),requestId:'other-v31-request'}])),
  'receipt_request_conflict');
 deny(()=>verify(snapshot([{...record(),offerId:character}])),
  'receipt_request_conflict');
 deny(()=>verify(snapshot([{...record(),inboxRecordId:null}])),
  'paired_inbox_integrity_invalid');
 deny(()=>verify(snapshot([{...record(),inboxReceiptId:inbox}])),
  'paired_inbox_integrity_invalid');
 deny(()=>verify(snapshot([{...record(),inboxAccountId:character}])),
  'paired_inbox_integrity_invalid');
 deny(()=>verify(snapshot([{...record(),inboxCharacterId:account}])),
  'paired_inbox_integrity_invalid');
 deny(()=>verify(snapshot([{...record(),inboxRewardHash:'c'.repeat(64)}])),
  'paired_inbox_integrity_invalid');
 deny(()=>verify(snapshot([{...record(),inboxEventStartsAt:'2026-11-02T00:00:00Z'}])),
  'paired_inbox_integrity_invalid');
 deny(()=>verify(snapshot([{...record(),receiptStatus:'pending'}])),
  'receipt_integrity_invalid');
 deny(()=>verify(snapshot([{...record(),stateAfterHash:'invalid'}])),
  'receipt_integrity_invalid');
 let calls=0;
 const db={queryOne:async(
  sql:typeof PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31,
  params:readonly [string,string,string])=>{
   calls++;
   yes(sql===PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31
    &&params[0]===account&&params[1]===offer&&params[2]===request,
    'trusted_parameter_order');
   return {recovery:snapshot([record()])};
  }};
 await denyAsync(()=>inspectPrivatePartyEventReceiptV31({
  gateEnabled:false,trustedAccountId:account,offerId:offer,requestId:request,db,
 }),'inspection_gate_disabled');
 await denyAsync(()=>inspectPrivatePartyEventReceiptV31({
  gateEnabled:true,trustedAccountId:account,offerId:offer,
  requestId:'invalid request !',db,
 }),'trusted_request_invalid');
 yes(calls===0,'invalid_request_never_reads');
 const fromDb=await inspectPrivatePartyEventReceiptV31({
  gateEnabled:true,trustedAccountId:account,offerId:offer,requestId:request,db,
 });
 yes(Number(calls)===1&&fromDb.status==='paired_receipt_present'
  &&!fromDb.clientSuccessAllowed,'db_read_still_nonpaying');
 await denyAsync(()=>retryPrivatePartyEventClaimV31(),
  'atomic_claim_unreleased');
 console.log('Party Events v31: account/offer/request receipt replay inspection, mismatches rejected, no unsafe retry or client success');
}
void test().catch(e=>{console.error(e);process.exitCode=1;});
