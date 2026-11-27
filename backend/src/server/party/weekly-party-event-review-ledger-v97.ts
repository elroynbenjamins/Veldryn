/**
 * Party Events V97 — HIDDEN nonpaying review-receipt contract.
 *
 * An injected disposable store can exercise transaction/replay mechanics.
 * No production Postgres adapter, durable claim or entitlement writer exists.
 * IMPORTANT: Neither this receipt nor V96's audit grants a V87 certificate.
 */
import {enemyV2SnapshotDigest} from '../combat/v2/enemy-engine-authority';
import type {NonpayingPartyEventReplayV96} from './weekly-party-event-replay-v96';

export const PARTY_EVENT_REVIEW_LEDGER_V97_RELEASED=false;
export const PARTY_EVENT_REVIEW_LEDGER_V97_VERSION='party-event-review-ledger-v97' as const;

export interface NonpayingReviewReceiptV97 {
 readonly version:typeof PARTY_EVENT_REVIEW_LEDGER_V97_VERSION;
 readonly status:'qa_evidence_only';
 readonly key:string;
 readonly partyId:string;
 readonly eventId:string;
 readonly encounterId:string;
 readonly sourceDigest:string;
 readonly reviewDigest:string;
 readonly resultDigest:string;
 readonly accountIds:readonly string[];
 readonly independentlyCertified:false;
 readonly claimable:false;
 readonly rewardGranted:false;
}
export interface ReviewLedgerTransactionV97 {
 /** Retrieve immutable evidence by its server-derived source scope. */
 readonly read:(key:string)=>Promise<NonpayingReviewReceiptV97|null>;
 /** Only permits a nonpaying receipt, never Gold/items/Inbox writes. */
 readonly insert:(receipt:NonpayingReviewReceiptV97)=>Promise<void>;
}
export interface ReviewLedgerStoreV97 {
 /** MUST serialize/lock the key on one DB transaction in future adapter.
  * The current tests only implement a fake, not a production guarantee. */
 readonly transact:<T>(key:string,fn:(
  transaction:ReviewLedgerTransactionV97)=>Promise<T>)=>Promise<T>;
}
export interface ReviewLedgerResultV97 {
 readonly receipt:NonpayingReviewReceiptV97;
 readonly newlyRecorded:boolean;
}
const validDigest=(v:unknown):v is string=>
 typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const validId=(v:unknown):v is string=>
 typeof v==='string'&&v.length>0&&v.length<=128&&
 /^[a-zA-Z0-9:_-]+$/.test(v);
const fail=(reason:string):never=>{throw Error('party_event_v97_'+reason);};

function sameReceipt(
 a:NonpayingReviewReceiptV97,b:NonpayingReviewReceiptV97,
):boolean{
 return enemyV2SnapshotDigest(a)===enemyV2SnapshotDigest(b);
}
function requireCanonicalReceipt(r:NonpayingReviewReceiptV97){
 if(!r||r.version!==PARTY_EVENT_REVIEW_LEDGER_V97_VERSION||
  r.status!=='qa_evidence_only'||!validDigest(r.key)||
  !validId(r.partyId)||!validId(r.eventId)||!validId(r.encounterId)||
  !validDigest(r.sourceDigest)||!validDigest(r.reviewDigest)||
  !validDigest(r.resultDigest)||!Array.isArray(r.accountIds)||
  r.accountIds.length<2||r.accountIds.length>4||
  r.accountIds.some(x=>!validId(x))||
  new Set(r.accountIds).size!==r.accountIds.length||
  r.independentlyCertified!==false||r.claimable!==false||
  r.rewardGranted!==false)
  fail('invalid_readback');
}
/**
 * Replay-safe in a transactional store, but never treats synthetic review
 * evidence as true ownership or reward authority. No payment APIs reachable.
 */
export async function recordNonpayingPartyReviewV97(input:{
 readonly replay:NonpayingPartyEventReplayV96;
 readonly store:ReviewLedgerStoreV97;
},qaEnabled=false):Promise<ReviewLedgerResultV97>{
 if(!qaEnabled||PARTY_EVENT_REVIEW_LEDGER_V97_RELEASED||
  process.env.NODE_ENV==='production')fail('unreleased');
 const replay=input?.replay,audit=replay?.audit;
 if(!replay||replay.status!=='deterministic_qa_replay'||
  replay.identicalReplay!==true||replay.replayCount!==2||
  replay.independentlyCertified!==false||replay.claimable!==false||
  replay.rewardGranted!==false||
  !validDigest(replay.sourceDigest)||!audit||
  audit.status!=='nonpaying_qa_review'||
  audit.independentlyCertified!==false||audit.claimable!==false||
  audit.rewardGranted!==false||!validDigest(audit.reviewDigest)||
  !validDigest(audit.resultDigest)||
  !validId(audit.partyId)||!validId(audit.eventId)||
  !validId(audit.encounterId)||!Array.isArray(audit.contributions)||
  audit.contributions.length<2||audit.contributions.length>4||
  audit.contributions.some(row=>!validId(row.accountId)||
   !validId(row.characterId)||!validId(row.actorId))||
  new Set(audit.contributions.map(row=>row.accountId)).size!==
   audit.contributions.length||!input.store||
  typeof input.store.transact!=='function')
  fail('invalid_replay_source');
 // An encounter can have only one canonical event assignment. Reusing the
 // same encounter ID with a different event cannot mint a second receipt.
 const key=enemyV2SnapshotDigest({encounterId:audit.encounterId});
 const expected:NonpayingReviewReceiptV97={
  version:PARTY_EVENT_REVIEW_LEDGER_V97_VERSION,
  status:'qa_evidence_only',key,partyId:audit.partyId,
  eventId:audit.eventId,encounterId:audit.encounterId,
  sourceDigest:replay.sourceDigest,
  reviewDigest:audit.reviewDigest,
  resultDigest:audit.resultDigest,
  accountIds:audit.contributions.map(x=>x.accountId),
  independentlyCertified:false,claimable:false,rewardGranted:false,
 };
 requireCanonicalReceipt(expected);
 return input.store.transact(key,async tx=>{
  if(!tx||typeof tx.read!=='function'||
   typeof tx.insert!=='function')fail('untrusted_transaction');
  const prior=await tx.read(key);
  if(prior!==null){
   requireCanonicalReceipt(prior);
   if(!sameReceipt(prior,expected))fail('conflicting_replay');
   return {receipt:prior,newlyRecorded:false};
  }
  await tx.insert(expected);
  const readback=await tx.read(key);
  // Throw explicitly so strict TypeScript narrows the nullable store read.
  if(readback===null)throw Error('party_event_v97_missing_readback');
  requireCanonicalReceipt(readback);
  if(!sameReceipt(readback,expected))fail('incorrect_readback');
  return {receipt:readback,newlyRecorded:true};
 });
}
