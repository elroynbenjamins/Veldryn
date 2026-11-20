import {
 PARTY_EVENT_SOURCE_OUTBOX_WORKER_V47_RELEASED,
 createHiddenPartyEventSourceDispatcherV47,
 type PartyEventSourceLeaseV47,
 type TrustedPartyEventOutboxV47,
 type TrustedPartyEventCreditorV47,
} from '../party-event-source-outbox-worker-v47';

function check(value:unknown,message:string):asserts value{
 if(!value)throw Error('party_event_v47_test_'+message);
}
const craft:PartyEventSourceLeaseV47={
 source_type:'craft',source_ref:'11111111-1111-4111-8111-111111111111',
 lease_token:'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa',attempt_count:1,
};
const idle:PartyEventSourceLeaseV47={
 source_type:'idle',source_ref:'22222222-2222-4222-8222-222222222222',
 lease_token:'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaaa',attempt_count:2,
};
const credited={
 status:'credited',eventPointsGranted:1,pointsAddedThisInvocation:1,
 totalMemberPoints:2,stage:1,credited:true,
} as const;
const replayed={
 status:'replayed',eventPointsGranted:1,pointsAddedThisInvocation:0,
 totalMemberPoints:2,stage:1,credited:true,
} as const;
const notEnrolled={
 status:'not_enrolled',eventPointsGranted:0,pointsAddedThisInvocation:0,
 credited:false,
} as const;
function stubStore(
 batch:readonly PartyEventSourceLeaseV47[],
 options:{complete?:boolean;ackThrows?:boolean}={},
){
 const acked:string[]=[],retried:string[]=[];
 const store:TrustedPartyEventOutboxV47={
  async lease(){return batch;},
  async complete(lease){
   acked.push(lease.source_ref);
   if(options.ackThrows)throw Error('storage_connection_lost');
   return options.complete??true;
  },
  async retry(lease,reason){retried.push(lease.source_ref+':'+reason);return true;},
 };
 return {store,acked,retried};
}
async function main(){
 check(!PARTY_EVENT_SOURCE_OUTBOX_WORKER_V47_RELEASED,'hidden_by_default');
 const ok=stubStore([craft,idle]);
 const sources:string[]=[];
 const creditor:TrustedPartyEventCreditorV47={
  async creditCommittedSource(source){
   sources.push(source.kind);
   return source.kind==='craft'?credited:replayed;
  },
 };
 const result=await createHiddenPartyEventSourceDispatcherV47(ok.store,creditor).drainOnce(2);
 check(result.leased===2&&result.completed===2&&result.retried===0
  &&result.newlyCredited===1&&result.replayed===1,
  'distinct_sources_ack_after_verified_credit');
 check(sources.join(',')==='craft,idle'&&ok.acked.length===2,
  'trusted_outbox_source_types_mapped_to_v43');
 const missing=stubStore([idle]);
 const noEvent=await createHiddenPartyEventSourceDispatcherV47(missing.store,{
  async creditCommittedSource(){return notEnrolled;},
 }).drainOnce();
 check(noEvent.notEnrolled===1&&noEvent.completed===1,
  'non_enrolled_is_acknowledged_without_retroactive_credit');
 const failure=stubStore([craft]);
 const retry=await createHiddenPartyEventSourceDispatcherV47(failure.store,{
  async creditCommittedSource(){throw Error('party_event_v43_private_credit_unavailable');},
 }).drainOnce();
 check(retry.retried===1&&retry.completed===0&&failure.acked.length===0
  &&failure.retried[0]===craft.source_ref+':private_credit_unavailable',
  'credit_unavailable_keeps_source_for_retry');
 const ackLost=stubStore([craft],{ackThrows:true});
 const queued=await createHiddenPartyEventSourceDispatcherV47(ackLost.store,creditor).drainOnce();
 check(queued.retried===1&&queued.completed===0
  &&ackLost.retried[0]===craft.source_ref+':worker_ack_unavailable',
  'post_credit_ack_failure_must_not_lose_source');
 const stale=stubStore([craft],{complete:false});
 const oldLease=await createHiddenPartyEventSourceDispatcherV47(stale.store,creditor).drainOnce();
 check(oldLease.staleLeases===1&&oldLease.completed===0,
  'outdated_owner_cannot_ack_new_lease');
 const duplicate=stubStore([craft,craft]);
 let rejected=false;
 try{await createHiddenPartyEventSourceDispatcherV47(duplicate.store,creditor).drainOnce();}
 catch(e){rejected=String(e).includes('duplicate_private_lease');}
 check(rejected,'duplicate_db_leases_denied_before_processing');
 const malformed=stubStore([{...craft,lease_token:'wrong'}]);
 rejected=false;
 try{await createHiddenPartyEventSourceDispatcherV47(malformed.store,creditor).drainOnce();}
 catch(e){rejected=String(e).includes('invalid_private_lease');}
 check(rejected,'malformed_lease_denied_before_processing');
 rejected=false;
 try{await createHiddenPartyEventSourceDispatcherV47(ok.store,creditor).drainOnce(26);}
 catch(e){rejected=String(e).includes('invalid_batch_limit');}
 check(rejected,'oversized_work_batch_denied');
 console.log('PARTY_EVENTS_V47_WORKER_OK: canonical dispatch, replay, stale leases, retry, ack-loss recovery, malformed rejection, hidden');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
