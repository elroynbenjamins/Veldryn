/**
 * Hidden Party Events v31 — read-only receipt recovery after a lost response.
 * This NEVER proves an economy transfer, enables a retry or tells a client
 * that rewards were paid. A future reviewed atomic writer is still required.
 */
export const PARTY_EVENT_RECEIPT_RECOVERY_V31_RELEASED=false;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const REQUEST_ID=/^[a-zA-Z0-9_-]{8,128}$/;
const HASH=/^[a-f0-9]{64}$/;

/** Account ID MUST come from authenticated server context, not the caller. */
export const PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31=`
select jsonb_build_object(
 'schema','party-event-receipt-recovery-v31',
 'accountId',$1::uuid,'offerId',$2::uuid,
 'records',coalesce((
  select jsonb_agg(jsonb_build_object(
   'receiptId',r.id,'inboxId',r.inbox_id,
   'accountId',r.account_id,'offerId',r.offer_id,
   'characterId',r.character_id,'eventStartsAt',r.event_starts_at,
   'requestId',r.request_id,'receiptStatus',r.status,
   'rewardHash',r.reward_hash,'stateAfterHash',r.state_after_hash,
   'inboxRecordId',m.id,'inboxReceiptId',m.receipt_id,
   'inboxAccountId',m.account_id,'inboxOfferId',m.offer_id,
   'inboxCharacterId',m.character_id,'inboxEventStartsAt',m.event_starts_at,
   'inboxRewardHash',m.reward_hash,'inboxDeliveryState',m.delivery_state)
   order by r.created_at,r.id)
  from private.party_event_paid_claim_receipts_v29 r
  left join private.party_event_paid_claim_inbox_v29 m on m.id=r.inbox_id
  where r.account_id=$1::uuid
   and (r.offer_id=$2::uuid or r.request_id=$3::text)
 ),'[]'::jsonb)
) as recovery
` as const;

function must(ok:unknown,reason:string):asserts ok{
 if(!ok)throw Error('party_event_v31_'+reason);
}
function object(v:unknown):v is Record<string,unknown>{
 return v!==null&&typeof v==='object'&&!Array.isArray(v);
}
function sameInstant(a:unknown,b:unknown):boolean{
 return typeof a==='string'&&typeof b==='string'
  &&Number.isFinite(Date.parse(a))&&Date.parse(a)===Date.parse(b);
}
export interface PartyEventReceiptRecoveryV31{
 readonly status:'not_recorded'|'paired_receipt_present';
 readonly receiptId:string|null;
 readonly accountId:string;
 readonly offerId:string;
 readonly retryAuthorized:false;
 readonly clientSuccessAllowed:false;
 readonly economyIndependentlyVerified:false;
 readonly payoutWriterReleased:false;
 readonly inspectionOnly:true;
}
export interface PrivatePartyEventReceiptSqlV31{
 queryOne(sql:typeof PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31,
  params:readonly [string,string,string]):Promise<{recovery:unknown}|null>;
}
/**
 * Check both original offer and request, not just the request:
 * a mismatched request or reused key must never appear as "not paid".
 */
export function validatePrivatePartyEventReceiptRecoveryV31(input:{
 trustedAccountId:string;offerId:string;requestId:string;recovery:unknown;
}):PartyEventReceiptRecoveryV31{
 must(UUID.test(input.trustedAccountId)&&UUID.test(input.offerId)
  &&REQUEST_ID.test(input.requestId),'trusted_request_invalid');
 const v=input.recovery;
 must(object(v)&&v.schema==='party-event-receipt-recovery-v31'
  &&v.accountId===input.trustedAccountId&&v.offerId===input.offerId
  &&Array.isArray(v.records),'snapshot_invalid');
 const rows=v.records;
 must(rows.length<=2,'ambiguous_receipt_candidates');
 const base={
  accountId:input.trustedAccountId,offerId:input.offerId,
  retryAuthorized:false as const,clientSuccessAllowed:false as const,
  economyIndependentlyVerified:false as const,
  payoutWriterReleased:false as const,inspectionOnly:true as const,
 };
 if(rows.length===0)return {...base,status:'not_recorded',receiptId:null};
 must(rows.length===1&&object(rows[0]),'ambiguous_receipt_candidates');
 const r=rows[0];
 must(r.accountId===input.trustedAccountId&&UUID.test(String(r.offerId))
  &&typeof r.requestId==='string'&&REQUEST_ID.test(r.requestId),
  'receipt_identity_invalid');
 must(r.offerId===input.offerId&&r.requestId===input.requestId,
  'receipt_request_conflict');
 must(typeof r.receiptId==='string'&&UUID.test(r.receiptId)
  &&typeof r.inboxId==='string'&&UUID.test(r.inboxId)
  &&r.receiptId!==r.inboxId
  &&typeof r.characterId==='string'&&UUID.test(r.characterId)
  &&typeof r.rewardHash==='string'&&HASH.test(r.rewardHash)
  &&typeof r.stateAfterHash==='string'&&HASH.test(r.stateAfterHash)
  &&typeof r.eventStartsAt==='string'
  &&Number.isFinite(Date.parse(r.eventStartsAt))
  &&r.receiptStatus==='paid','receipt_integrity_invalid');
 must(r.inboxRecordId===r.inboxId&&r.inboxReceiptId===r.receiptId
  &&r.inboxAccountId===r.accountId&&r.inboxOfferId===r.offerId
  &&r.inboxCharacterId===r.characterId
  &&sameInstant(r.inboxEventStartsAt,r.eventStartsAt)
  &&r.inboxRewardHash===r.rewardHash
  &&r.inboxDeliveryState==='delivered',
  'paired_inbox_integrity_invalid');
 return {...base,status:'paired_receipt_present',receiptId:r.receiptId};
}
export async function inspectPrivatePartyEventReceiptV31(input:{
 gateEnabled:boolean;trustedAccountId:string;offerId:string;
 requestId:string;db:PrivatePartyEventReceiptSqlV31;
}):Promise<PartyEventReceiptRecoveryV31>{
 must(input.gateEnabled,'inspection_gate_disabled');
 must(UUID.test(input.trustedAccountId)&&UUID.test(input.offerId)
  &&REQUEST_ID.test(input.requestId),'trusted_request_invalid');
 const row=await input.db.queryOne(PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31,
  [input.trustedAccountId,input.offerId,input.requestId]);
 must(row,'snapshot_missing');
 return validatePrivatePartyEventReceiptRecoveryV31({
  trustedAccountId:input.trustedAccountId,offerId:input.offerId,
  requestId:input.requestId,recovery:row.recovery,
 });
}
export async function retryPrivatePartyEventClaimV31():Promise<never>{
 throw Error('party_event_v31_atomic_claim_unreleased');
}
