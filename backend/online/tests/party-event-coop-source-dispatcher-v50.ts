import {
 PARTY_EVENT_COOP_SOURCE_DISPATCH_V50_RELEASED,
 createHiddenPartyCoopSourceDispatcherV50,
 type PartyEventCoopActorLeaseV50,
 type TrustedCoopActorOutboxV50,
} from '../party-event-coop-source-dispatcher-v50';
import type {PartyEventCreditResultV43} from '../party-event-activity-credit-worker-v43';

function check(condition:unknown,message:string):asserts condition{
 if(!condition)throw Error('party_event_v50_test_'+message);
}
const lease:PartyEventCoopActorLeaseV50={
 run_id:'11111111-1111-4111-8111-111111111111',
 node_id:'COMBAT_A',
 actor_account_id:'22222222-2222-4222-8222-222222222222',
 lease_token:'33333333-3333-4333-8333-333333333333',attempt_count:1,
};
const next:PartyEventCoopActorLeaseV50={
 ...lease,actor_account_id:'44444444-4444-4444-8444-444444444444',
 lease_token:'55555555-5555-4555-8555-555555555555',
};
const credited:PartyEventCreditResultV43={
 status:'credited',credited:true,eventPointsGranted:1,
 pointsAddedThisInvocation:1,totalMemberPoints:1,stage:2,
};
const replayed:PartyEventCreditResultV43={
 ...credited,status:'replayed',pointsAddedThisInvocation:0,
};
const notEnrolled:PartyEventCreditResultV43={
 status:'not_enrolled',credited:false,eventPointsGranted:0,
 pointsAddedThisInvocation:0,
};
function fixtures(
 leases:readonly PartyEventCoopActorLeaseV50[],
 options:{ack?:boolean;ackThrow?:boolean}={},
){
 const requests:string[]=[];
 const outbox:TrustedCoopActorOutboxV50={
  async lease(){return leases;},
  async complete(source){
   requests.push('ack:'+source.actor_account_id);
   if(options.ackThrow)throw Error('closed');
   return options.ack??true;
  },
  async retry(source,reason){requests.push('retry:'+source.actor_account_id+':'+reason);return true;},
 };
 return {outbox,requests};
}
async function main(){
 check(PARTY_EVENT_COOP_SOURCE_DISPATCH_V50_RELEASED===false,'must_remain_unmounted');
 const success=fixtures([lease,next]);
 const called:string[]=[];
 const result=await createHiddenPartyCoopSourceDispatcherV50(success.outbox,{
  async creditCommittedSource(source){
   check(source.kind==='coop_node','only_committed_coop_actor_identity');
   called.push(source.actorAccountId);
   return source.actorAccountId===lease.actor_account_id?credited:replayed;
  },
 }).drainOnce(2);
 check(result.leased===2&&result.completed===2&&result.newlyCredited===1
  &&result.replayed===1&&result.retried===0,'replay_never_counts_twice');
 check(called.join(',')===lease.actor_account_id+','+next.actor_account_id,
  'one_canonical_node_source_per_attested_human');
 const missing=fixtures([lease]);
 const absent=await createHiddenPartyCoopSourceDispatcherV50(missing.outbox,{
  async creditCommittedSource(){return notEnrolled;},
 }).drainOnce();
 check(absent.notEnrolled===1&&absent.completed===1,
  'not_enrolled_never_creates_retroactive_points');
 const broken=fixtures([lease]);
 const retry=await createHiddenPartyCoopSourceDispatcherV50(broken.outbox,{
  async creditCommittedSource(){throw Error('party_event_v43_private_credit_unavailable');},
 }).drainOnce();
 check(retry.retried===1&&retry.completed===0&&
  broken.requests[0]?.includes('private_credit_unavailable'),
  'credit_outage_retries_without_acknowledging');
 const ackError=fixtures([lease],{ackThrow:true});
 const again=await createHiddenPartyCoopSourceDispatcherV50(ackError.outbox,{
  async creditCommittedSource(){return credited;},
 }).drainOnce();
 check(again.completed===0&&again.retried===1
  &&ackError.requests.some(x=>x.endsWith('worker_ack_unavailable')),
  'post_credit_crash_requeues_source');
 const stale=fixtures([lease],{ack:false});
 const staleResult=await createHiddenPartyCoopSourceDispatcherV50(stale.outbox,{
  async creditCommittedSource(){return credited;},
 }).drainOnce();
 check(staleResult.staleLeases===1&&staleResult.completed===0,
  'expired_worker_cannot_ack_new_holder');
 let denied=false;
 try{await createHiddenPartyCoopSourceDispatcherV50(
  fixtures([lease,lease]).outbox,{async creditCommittedSource(){return credited;}},
 ).drainOnce(2);}catch(e){denied=String(e).includes('duplicate_private_lease');}
 check(denied,'duplicate_batch_denied_before_any_credit');
 denied=false;
 try{await createHiddenPartyCoopSourceDispatcherV50(
  fixtures([{...lease,node_id:'BAD;DROP'}]).outbox,
  {async creditCommittedSource(){return credited;}},
 ).drainOnce();}catch(e){denied=String(e).includes('invalid_canonical_coop_lease');}
 check(denied,'forged_node_identifier_denied');
 denied=false;
 try{await createHiddenPartyCoopSourceDispatcherV50(success.outbox,{
  async creditCommittedSource(){return credited;},
 }).drainOnce(26);}catch(e){denied=String(e).includes('invalid_batch_size');}
 check(denied,'bounded_batch_required');
 console.log('PARTY_EVENTS_V50_WORKER_OK: frozen human source identity, replay, retry, stale ack, fail-closed input and default-off');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
