/**
 * Party Events V36 — immutable Day 8 evidence audit, NOT settlement.
 *
 * This combines previously verified private snapshots to identify unsafe
 * settlement inputs. It never authorizes payout; a separate account-locked
 * SQL transaction, persistent Renown sink, Inbox parity, revision checks and
 * independent approvals are still mandatory before an actual launch.
 */
import type {PartyEventReadOnlyStatusV33} from './party-event-readonly-status-v33';
import {parsePartyEventReadOnlyStatusV33} from './party-event-readonly-status-v33';
import type {PartyEventSchemaGateV35} from './party-event-schema-readiness-v35';
import type {VerifiedPartyEventEvidenceV27} from '../src/server/party/weekly-party-settlement-evidence-v27';
import type {VerifiedPartyEventLockedSnapshotV30} from './party-event-locked-snapshot-v30';
import type {PartyEventReceiptRecoveryV31} from './party-event-receipt-recovery-v31';

export const PARTY_EVENT_DAY8_V36_PAYOUT_RELEASED=false;
type EvidenceV36=Pick<VerifiedPartyEventEvidenceV27,
 'trustedAccountId'|'offerId'|'partyId'|'eventStartsAt'
 |'frozenCharacterId'|'quoteHash'|'onlineRevision'
 |'evidenceReconciled'|'payoutEnabled'|'claimed'|'economyApplied'
 |'inboxDelivered'>;
type LockedV36=Pick<VerifiedPartyEventLockedSnapshotV30,
 'accountId'|'offerId'|'partyId'|'eventStartsAt'
 |'frozenCharacterId'|'quoteHash'|'onlineRevision'
 |'walletGold'|'characterGold'|'previewOnly'|'paid'|'locksHeld'
 |'requiresRevalidationInsidePaymentTransaction'>;
type RecoveryV36=Pick<PartyEventReceiptRecoveryV31,
 'status'|'accountId'|'offerId'|'retryAuthorized'
 |'clientSuccessAllowed'|'economyIndependentlyVerified'
 |'payoutWriterReleased'|'inspectionOnly'>;
export interface PartyEventDay8AuditInputV36{
 readonly trustedAccountId:string;
 readonly snapshot:PartyEventReadOnlyStatusV33;
 readonly evidence:EvidenceV36;
 readonly locked:LockedV36;
 readonly recovery:RecoveryV36;
 readonly schema:PartyEventSchemaGateV35;
}
export interface PartyEventDay8AuditV36{
 readonly previewEvidenceCoherent:boolean;
 readonly issues:readonly string[];
 readonly payoutAuthorized:false;
 readonly canGrant:false;
 readonly claimReady:false;
 readonly readOnly:true;
 readonly requiresAtomicWriter:true;
}
function validInstant(value:unknown):value is string{
 return typeof value==='string'&&Number.isFinite(Date.parse(value));
}
/** Present every failed condition instead of assuming historical SQL locks persist. */
export function auditPartyEventDay8ReadinessV36(
 input:PartyEventDay8AuditInputV36,
):PartyEventDay8AuditV36{
 const issues:string[]=[];
 let snapshot:PartyEventReadOnlyStatusV33;
 try{snapshot=parsePartyEventReadOnlyStatusV33(input.snapshot);}
 catch{issues.push('invalid_event_snapshot');snapshot=input.snapshot;}
 const {evidence:e,locked:l,recovery:r,schema}=input;
 if(schema.ready!==true||schema.missingOrMismatched.length
  ||schema.unsafeGrants.length)
  issues.push('private_schema_not_verified');
 if(schema.rolloutApproved!==false||PARTY_EVENT_DAY8_V36_PAYOUT_RELEASED!==false)
  issues.push('unexpected_release_state');
 if(e.trustedAccountId!==input.trustedAccountId
  ||l.accountId!==input.trustedAccountId
  ||r.accountId!==input.trustedAccountId
  ||e.offerId!==l.offerId||e.offerId!==r.offerId
  ||e.partyId!==l.partyId
  ||e.frozenCharacterId!==l.frozenCharacterId)
  issues.push('identity_or_offer_mismatch');
 if(!validInstant(e.eventStartsAt)||!validInstant(l.eventStartsAt)
  ||!validInstant(snapshot.eventStartsAt)
  ||Date.parse(e.eventStartsAt)!==Date.parse(l.eventStartsAt)
  ||Date.parse(e.eventStartsAt)!==Date.parse(snapshot.eventStartsAt))
  issues.push('event_window_identity_mismatch');
 if(snapshot.stage!==3||!['closed','settled'].includes(snapshot.status))
  issues.push('event_not_final');
 if(!snapshot.votes.stage2||!snapshot.votes.stage3)
  issues.push('final_ballots_not_locked');
 if(!validInstant(snapshot.serverTime)||!validInstant(snapshot.eventEndsAt)
  ||Date.parse(snapshot.serverTime)<Date.parse(snapshot.eventEndsAt)+3600000)
  issues.push('settlement_window_not_open');
 for(const stage of [1,2,3] as const){
  const orders=snapshot.orders.filter(o=>o.stage===stage&&o.kind==='required');
  if(orders.length<3||orders.some(o=>o.donated!==o.target))
   issues.push('stage_'+stage+'_supplies_not_verified');
 }
 if(!e.evidenceReconciled||e.payoutEnabled||e.claimed
  ||e.economyApplied||e.inboxDelivered)
  issues.push('reward_evidence_inconsistent');
 if(l.previewOnly!==true||l.paid!==false||l.locksHeld!==false
  ||l.requiresRevalidationInsidePaymentTransaction!==true)
  issues.push('stale_or_privileged_locked_snapshot');
 if(!Number.isSafeInteger(e.onlineRevision)||e.onlineRevision<0
  ||l.onlineRevision!==e.onlineRevision
  ||l.walletGold!==l.characterGold||!Number.isSafeInteger(l.walletGold)
  ||l.walletGold<0||!Number.isSafeInteger(l.characterGold)
  ||l.characterGold<0||l.quoteHash!==e.quoteHash)
  issues.push('revision_quote_or_gold_mismatch');
 if(r.status!=='not_recorded'||r.retryAuthorized!==false
  ||r.clientSuccessAllowed!==false||r.economyIndependentlyVerified!==false
  ||r.payoutWriterReleased!==false||r.inspectionOnly!==true)
  issues.push('receipt_already_present_or_untrusted');
 return {
  previewEvidenceCoherent:issues.length===0,
  issues:[...new Set(issues)],
  payoutAuthorized:false,canGrant:false,claimReady:false,
  readOnly:true,requiresAtomicWriter:true,
 };
}
/** This can never perform a live Day 8 grant. */
export async function settlePartyEventDay8V36():Promise<never>{
 throw Error('party_event_v36_atomic_settlement_unreleased');
}
