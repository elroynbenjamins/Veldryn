/**
 * Party Events V47 — HIDDEN crash-safe canonical source dispatcher.
 *
 * This is NOT mounted to a public route, cron, client, or a running backend.
 * A future approved, service-role-only worker must load leases from the
 * private V47 SQL functions and use V43's authoritative credit bridge.
 * Server restarts and duplicate deliveries are safe because the canonical
 * V14 receipt is idempotent; only the current lease token may acknowledge.
 */
import type {
 TrustedCommittedPartyActivityV43,
 PartyEventCreditResultV43,
} from './party-event-activity-credit-worker-v43';

export const PARTY_EVENT_SOURCE_OUTBOX_WORKER_V47_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PartyEventSourceLeaseV47{
 readonly source_type:'idle'|'craft';
 readonly source_ref:string;
 readonly lease_token:string;
 readonly attempt_count:number;
}
export type PartyEventOutboxRetryReasonV47=
 'private_credit_unavailable'|'malformed_private_credit'|
 'worker_backend_unavailable'|'worker_ack_unavailable';

export interface TrustedPartyEventOutboxV47{
 /** SQL: private.lease_party_event_sources_v47; service_role ONLY. */
 lease(maxRows:number,leaseSeconds:number):Promise<readonly PartyEventSourceLeaseV47[]>;
 /** SQL: private.complete_party_event_source_v47; stale token returns false. */
 complete(lease:PartyEventSourceLeaseV47):Promise<boolean>;
 /** SQL: private.retry_party_event_source_v47; stale token returns false. */
 retry(lease:PartyEventSourceLeaseV47,reason:PartyEventOutboxRetryReasonV47):Promise<boolean>;
}
export interface TrustedPartyEventCreditorV47{
 creditCommittedSource(source:TrustedCommittedPartyActivityV43):Promise<PartyEventCreditResultV43>;
}
export interface PartyEventOutboxRunSummaryV47{
 readonly leased:number;
 readonly completed:number;
 readonly retried:number;
 readonly staleLeases:number;
 readonly newlyCredited:number;
 readonly replayed:number;
 readonly notEnrolled:number;
}

function assertLease(lease:PartyEventSourceLeaseV47):void{
 if(!lease||!['craft','idle'].includes(lease.source_type)
  ||typeof lease.source_ref!=='string'||!UUID.test(lease.source_ref)
  ||typeof lease.lease_token!=='string'||!UUID.test(lease.lease_token)
  ||!Number.isSafeInteger(lease.attempt_count)||lease.attempt_count<1)
  throw Error('party_event_v47_invalid_private_lease');
}
function safeReason(e:unknown):PartyEventOutboxRetryReasonV47{
 const message=e instanceof Error?e.message:'';
 if(message==='party_event_v43_malformed_private_credit')
  return 'malformed_private_credit';
 if(message==='party_event_v43_private_credit_unavailable')
  return 'private_credit_unavailable';
 return 'worker_backend_unavailable';
}

/** Explicit service-side factory; drainOnce is never scheduled here. */
export function createHiddenPartyEventSourceDispatcherV47(
 outbox:TrustedPartyEventOutboxV47,
 creditor:TrustedPartyEventCreditorV47,
){
 return {
  async drainOnce(maxRows=10):Promise<PartyEventOutboxRunSummaryV47>{
   if(!Number.isSafeInteger(maxRows)||maxRows<1||maxRows>25)
    throw Error('party_event_v47_invalid_batch_limit');
   let batch:readonly PartyEventSourceLeaseV47[];
   try{batch=await outbox.lease(maxRows,90);}
   catch{throw Error('party_event_v47_private_outbox_unavailable');}
   if(!Array.isArray(batch)||batch.length>maxRows)
    throw Error('party_event_v47_malformed_private_outbox_batch');
   const seen=new Set<string>();
   for(const lease of batch){
    assertLease(lease);
    const key=lease.source_type+':'+lease.source_ref.toLowerCase();
    if(seen.has(key))throw Error('party_event_v47_duplicate_private_lease');
    seen.add(key);
   }

   let completed=0,retried=0,staleLeases=0,newlyCredited=0,replayed=0,notEnrolled=0;
   for(const lease of batch){
    // Source identity is selected by the DB, never provided by a device.
    const source:TrustedCommittedPartyActivityV43=lease.source_type==='idle'
     ?{kind:'idle',claimId:lease.source_ref}
     :{kind:'craft',receiptId:lease.source_ref};
    let credit:PartyEventCreditResultV43;
    try{credit=await creditor.creditCommittedSource(source);}
    catch(error){
     let retryAccepted:boolean;
     try{retryAccepted=await outbox.retry(lease,safeReason(error));}
     catch{throw Error('party_event_v47_outbox_retry_unavailable');}
     if(retryAccepted)retried++;
     else staleLeases++;
     continue;
    }
    let accepted:boolean;
    try{accepted=await outbox.complete(lease);}
    catch{
     // The EP transaction may already have committed. A future replay is
     // harmless, but an unacknowledged source must NOT be discarded.
     try{accepted=await outbox.retry(lease,'worker_ack_unavailable');}
     catch{throw Error('party_event_v47_outbox_ack_unavailable');}
     if(accepted)retried++;
     else staleLeases++;
     continue;
    }
    if(!accepted){staleLeases++;continue;}
    completed++;
    if(credit.status==='credited')newlyCredited++;
    else if(credit.status==='replayed')replayed++;
    else notEnrolled++;
   }
   return {leased:batch.length,completed,retried,staleLeases,newlyCredited,replayed,notEnrolled};
  },
 };
}
