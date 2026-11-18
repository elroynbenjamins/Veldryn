import {
 PARTY_EVENT_CREDIT_BRIDGE_V43_RELEASED,
 PARTY_EVENT_IDLE_CREDIT_SQL_V43,
 PARTY_EVENT_CRAFT_CREDIT_SQL_V43,
 PARTY_EVENT_COOP_CREDIT_SQL_V43,
 privatePartyActivityKeyV43,
 createPrivatePartyActivityCreditWorkerV43,
 type TrustedCommittedPartyActivityV43,
 type TrustedPartyActivitySqlV43,
} from '../party-event-activity-credit-worker-v43';

function check(value:unknown,detail:string):asserts value{
 if(!value)throw Error('party_event_v43_test_'+detail);
}
const claim='11111111-1111-4111-8111-111111111111';
const recipe='22222222-2222-4222-8222-222222222222';
const run='33333333-3333-4333-8333-333333333333';
const actor='44444444-4444-4444-8444-444444444444';
const validCredit={replayed:false,eventPointsGranted:1,totalMemberPoints:13,stage:2};
const existingCreditId='55555555-5555-4555-8555-555555555555';
const idle:TrustedCommittedPartyActivityV43={kind:'idle',claimId:claim};
const craft:TrustedCommittedPartyActivityV43={kind:'craft',receiptId:recipe};
const coop:TrustedCommittedPartyActivityV43={
 kind:'coop_node',runId:run,nodeId:'BOSS:ALPHA_02',actorAccountId:actor,
};
let pending:{credit:unknown}|null={credit:validCredit};
const calls:{sql:string;params:readonly string[]}[]=[];
const db:TrustedPartyActivitySqlV43={
 queryOne:async(sql,params)=>{calls.push({sql,params});return pending;},
};
const worker=createPrivatePartyActivityCreditWorkerV43(db);
async function runTests(){
 check(PARTY_EVENT_CREDIT_BRIDGE_V43_RELEASED===false,'gate_off');
 for(const sql of [PARTY_EVENT_IDLE_CREDIT_SQL_V43,
  PARTY_EVENT_CRAFT_CREDIT_SQL_V43,PARTY_EVENT_COOP_CREDIT_SQL_V43]){
  check(sql.includes('private.party_event_roster_v11')
   &&sql.includes('private.party_event_weeks_v11')
   &&sql.includes('matching_weeks=1')
   &&sql.includes('private.credit_party_event_activity_v14(')
   &&sql.includes('count(*) over()'),'trusted_event_derived_from_receipt');
  check(!/\b(?:insert|update|delete|truncate|grant|revoke|create|drop)\s+(?:into|table|from|function|on)\b/i.test(sql),
   'only_one_canonical_private_v14_function_write');
 }
 check(PARTY_EVENT_IDLE_CREDIT_SQL_V43.includes('public.idle_claim_receipts')
  &&PARTY_EVENT_CRAFT_CREDIT_SQL_V43.includes('public.craft_receipts')
  &&PARTY_EVENT_COOP_CREDIT_SQL_V43.includes('public.coop_node_results'),
 'canonical_server_receipts_only');
 check(!PARTY_EVENT_IDLE_CREDIT_SQL_V43.includes('client')
  &&PARTY_EVENT_COOP_CREDIT_SQL_V43.includes('private.party_event_coop_node_actors_v49')
  &&PARTY_EVENT_COOP_CREDIT_SQL_V43.includes('witness.account_id=$3::uuid')
  &&!PARTY_EVENT_COOP_CREDIT_SQL_V43.includes('access.active'),
 'coop_requires_committed_human_witness_not_mutable_access');
 const first=await worker.creditCommittedSource(idle);
 check(first.status==='credited'&&first.credited&&first.eventPointsGranted===1
  &&first.pointsAddedThisInvocation===1,'idle_verified');
 check(calls[0]?.sql===PARTY_EVENT_IDLE_CREDIT_SQL_V43
  &&calls[0]?.params[0]===claim&&calls[0]?.params[1]===privatePartyActivityKeyV43(idle),
  'no_client_account_party_or_week');
 const second=await worker.creditCommittedSource(craft);
 check(second.status==='credited'&&calls[1]?.sql===PARTY_EVENT_CRAFT_CREDIT_SQL_V43
  &&calls[1]?.params[0]===recipe,'craft_credit');
 const third=await worker.creditCommittedSource(coop);
 check(third.status==='credited'&&calls[2]?.sql===PARTY_EVENT_COOP_CREDIT_SQL_V43
  &&calls[2]?.params.length===4&&calls[2]?.params[2]===actor,'coop_credit');
 check(privatePartyActivityKeyV43(coop)===privatePartyActivityKeyV43({...coop}),
 'stable_idempotency');
 check(privatePartyActivityKeyV43(idle)!==privatePartyActivityKeyV43(craft),
 'different_receipts_independent');
 check(privatePartyActivityKeyV43(coop)!==privatePartyActivityKeyV43(
  {kind:'coop_node',runId:run,nodeId:'BOSS:ALPHA_02',
   actorAccountId:'66666666-6666-4666-8666-666666666666'}),
 'multi_member_coop_distinct');
 pending={credit:{...validCredit,replayed:true,creditId:existingCreditId}};
 const replay=await worker.creditCommittedSource(idle);
 check(replay.status==='replayed'&&replay.credited
  &&replay.eventPointsGranted===1&&replay.pointsAddedThisInvocation===0,
  'same_source_retry_never_counts_as_new_ep');
 pending=null;
 const missing=await worker.creditCommittedSource(idle);
 check(missing.status==='not_enrolled'&&!missing.credited
  &&missing.eventPointsGranted===0&&missing.pointsAddedThisInvocation===0,
  'missing_or_ambiguous_enrollment_no_credit');
 for(const input of [
  {kind:'idle',claimId:'bad'},
  {kind:'craft',receiptId:'bad'},
  {kind:'coop_node',runId:run,nodeId:'x;drop table private.party_event_weeks_v11',actorAccountId:actor},
  {kind:'coop_node',runId:run,nodeId:'GOOD',actorAccountId:'not-an-account'},
 ] as TrustedCommittedPartyActivityV43[]){
  const before=calls.length;
  try{await worker.creditCommittedSource(input);throw Error('unexpected_valid_source');}
  catch(e){check(String(e).includes('party_event_v43_invalid'),'invalid_source_rejected');}
  check(before===calls.length,'invalid_input_never_queries_database');
 }
 for(const corrupted of [
  {...validCredit,eventPointsGranted:-1},
  {...validCredit,eventPointsGranted:100000},
  {...validCredit,totalMemberPoints:'13'},
  {...validCredit,stage:9},
  {...validCredit,replayed:'no'},
  {...validCredit,creditId:'wrong'},
  {...validCredit,replayed:true},
  {...validCredit,replayed:true,creditId:'wrong'},
  null,
 ]){
  pending={credit:corrupted};
  try{await worker.creditCommittedSource(idle);throw Error('unexpected_credit');}
  catch(e){check(String(e).includes('party_event_v43_malformed_private_credit'),
   'corrupt_reply_rejected');}
 }
 const down=createPrivatePartyActivityCreditWorkerV43({
  queryOne:async()=>{throw Error('DB private details MUST NOT LEAK');},
 });
 try{await down.creditCommittedSource(idle);throw Error('unexpected_no_error');}
 catch(e){check(String(e)==='Error: party_event_v43_private_credit_unavailable',
  'database_error_sanitized');}
 console.log('PARTY_EVENTS_V43_CREDIT_OK: server-owned canonical source, 3 kinds, exact replay, account overlap block, private SQL gate');
}
void runTests().catch(error=>{console.error(error);process.exitCode=1;});
