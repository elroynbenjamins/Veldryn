/**
 * V50 — HIDDEN server-only successful human co-op node source dispatcher.
 *
 * The private V50 SQL source queue is populated in the same transaction as a
 * verified live co-op result and V49 human witness. This worker is NOT
 * registered in an Edge route, cron, UI, scheduler or client RPC.
 * Only a privileged internal SQL service may instantiate these interfaces.
 */
import type {
 TrustedCommittedPartyActivityV43,
 PartyEventCreditResultV43,
} from './party-event-activity-credit-worker-v43';

export const PARTY_EVENT_COOP_SOURCE_DISPATCH_V50_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NODE=/^[a-zA-Z0-9_:.-]{1,100}$/;
export interface PartyEventCoopActorLeaseV50{
 readonly run_id:string;
 readonly node_id:string;
 readonly actor_account_id:string;
 readonly lease_token:string;
 readonly attempt_count:number;
}
export type PartyEventCoopRetryReasonV50=
 'private_credit_unavailable'|'malformed_private_credit'|
 'worker_backend_unavailable'|'worker_ack_unavailable';
export interface TrustedCoopActorOutboxV50{
 /** SQL: private.lease_party_event_coop_actors_v50 */
 lease(maxRows:number,leaseSeconds:number):Promise<readonly PartyEventCoopActorLeaseV50[]>;
 /** SQL: private.complete_party_event_coop_actor_v50 */
 complete(lease:PartyEventCoopActorLeaseV50):Promise<boolean>;
 /** SQL: private.retry_party_event_coop_actor_v50 */
 retry(lease:PartyEventCoopActorLeaseV50,reason:PartyEventCoopRetryReasonV50):Promise<boolean>;
}
export interface TrustedCoopActorCreditorV50{
 creditCommittedSource(source:TrustedCommittedPartyActivityV43):Promise<PartyEventCreditResultV43>;
}
export interface CoopActorDeliverySummaryV50{
 leased:number;
 completed:number;
 retried:number;
 staleLeases:number;
 newlyCredited:number;
 replayed:number;
 notEnrolled:number;
}
function validate(lease:PartyEventCoopActorLeaseV50){
 if(!lease||!UUID.test(lease.run_id)||!UUID.test(lease.actor_account_id)
  ||!UUID.test(lease.lease_token)||!NODE.test(lease.node_id)
  ||!Number.isSafeInteger(lease.attempt_count)||lease.attempt_count<1)
  throw Error('party_event_v50_invalid_canonical_coop_lease');
}
function safeReason(error:unknown):PartyEventCoopRetryReasonV50{
 const reason=error instanceof Error?error.message:'';
 if(reason==='party_event_v43_malformed_private_credit')return 'malformed_private_credit';
 if(reason==='party_event_v43_private_credit_unavailable')return 'private_credit_unavailable';
 return 'worker_backend_unavailable';
}

/** Explicit factory. Never mount on a mobile or public worker by default. */
export function createHiddenPartyCoopSourceDispatcherV50(
 outbox:TrustedCoopActorOutboxV50,creditor:TrustedCoopActorCreditorV50,
){
 return {
  async drainOnce(maxRows=10):Promise<CoopActorDeliverySummaryV50>{
   if(!Number.isSafeInteger(maxRows)||maxRows<1||maxRows>25)
    throw Error('party_event_v50_invalid_batch_size');
   let leases:readonly PartyEventCoopActorLeaseV50[];
   try{leases=await outbox.lease(maxRows,90);}
   catch{throw Error('party_event_v50_private_outbox_unavailable');}
   if(!Array.isArray(leases)||leases.length>maxRows)
    throw Error('party_event_v50_invalid_private_batch');
   const identities=new Set<string>();
   for(const lease of leases){
    validate(lease);
    const key=lease.run_id.toLowerCase()+':'+lease.node_id+':'
     +lease.actor_account_id.toLowerCase();
    if(identities.has(key))throw Error('party_event_v50_duplicate_private_lease');
    identities.add(key);
   }
   let completed=0,retried=0,staleLeases=0;
   let newlyCredited=0,replayed=0,notEnrolled=0;
   for(const lease of leases){
    const source:TrustedCommittedPartyActivityV43={
     kind:'coop_node',runId:lease.run_id,nodeId:lease.node_id,
     actorAccountId:lease.actor_account_id,
    };
    let credit:PartyEventCreditResultV43;
    try{credit=await creditor.creditCommittedSource(source);}
    catch(error){
     let accepted:boolean;
     try{accepted=await outbox.retry(lease,safeReason(error));}
     catch{throw Error('party_event_v50_private_retry_unavailable');}
     if(accepted)retried++;else staleLeases++;
     continue;
    }
    let ack:boolean;
    try{ack=await outbox.complete(lease);}
    catch{
     // V14 may have committed before ACK loss. A later canonical replay
     // is safe and MUST be reprocessed rather than silently discarded.
     let accepted:boolean;
     try{accepted=await outbox.retry(lease,'worker_ack_unavailable');}
     catch{throw Error('party_event_v50_private_ack_unavailable');}
     if(accepted)retried++;else staleLeases++;
     continue;
    }
    if(!ack){staleLeases++;continue;}
    completed++;
    if(credit.status==='credited')newlyCredited++;
    else if(credit.status==='replayed')replayed++;
    else notEnrolled++;
   }
   return {leased:leases.length,completed,retried,staleLeases,
    newlyCredited,replayed,notEnrolled};
  },
 };
}
