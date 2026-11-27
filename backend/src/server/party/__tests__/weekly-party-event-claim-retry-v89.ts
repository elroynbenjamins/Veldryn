/** V89 regression: only whole-claim transient PG failures may retry. */
import {
 createPartyEventClaimRetryV89,
 PARTY_EVENT_CLAIM_MAX_ATTEMPTS_V89,
 PARTY_EVENT_CLAIM_RETRY_V89_RELEASED,
} from '../weekly-party-event-claim-retry-v89';
import type {
 ChestOpenRequestV69,ChestOpenResultV69,
} from '../../loot/chest-reward-settlement-v69';

const owner='11111111-1111-4111-8111-111111111111';
const week=Date.UTC(2026,10,2);
const source='party-event:'+week+':'+owner+':participation';
const valid:ChestOpenRequestV69={
 authenticatedAccountId:owner,sourceKey:source,
};
const fakeReceipt={sourceKey:source,accountId:owner};
const result:ChestOpenResultV69={
 replayed:false,receipt:fakeReceipt as ChestOpenResultV69['receipt'],
};
function assert(x:unknown,label:string):asserts x{
 if(!x)throw Error('party_event_v89_test_'+label);
}
function pg(code:string):Error&{code:string}{
 const err=Object.assign(new Error('private postgres driver error'),{code});
 return err;
}
async function rejected(
 run:()=>Promise<unknown>,reason:string,
):Promise<unknown>{
 try{await run()}catch(e){
  assert(String(e).includes(reason),'expected_'+reason);
  return e;
 }
 throw Error('party_event_v89_test_expected_rejection_'+reason);
}
async function run(){
 assert(!PARTY_EVENT_CLAIM_RETRY_V89_RELEASED,'production_flag_off');
 assert(PARTY_EVENT_CLAIM_MAX_ATTEMPTS_V89===3,'bounded');
 let attempts=0;
 let firstRequest:ChestOpenRequestV69|undefined;
 const transient=createPartyEventClaimRetryV89(async request=>{
  assert(request!==valid&&Object.isFrozen(request)&&
   request.authenticatedAccountId===owner&&request.sourceKey===source,'same_immutable_request');
  if(firstRequest)assert(request===firstRequest,'stable_snapshot_across_attempts');
  else firstRequest=request;
  attempts++;
  if(attempts<3)throw pg(attempts===1?'40001':'40P01');
  return result;
 },true);
 const actual=await transient(valid);
 assert(actual===result&&attempts===3,
  'transaction_retry_then_one_frozen_result');

 // A mutable caller cannot redirect a retry to a different earned chest.
 const mutable={...valid};
 let mutationAttempts=0;
 const mutation=createPartyEventClaimRetryV89(async request=>{
  mutationAttempts++;
  assert(request.sourceKey===source&&request.authenticatedAccountId===owner,
   'original_authenticated_identity_preserved');
  if(mutationAttempts===1){
   mutable.sourceKey=source.replace(':participation',':finale');
   mutable.authenticatedAccountId='22222222-2222-4222-8222-222222222222';
   throw pg('40001');
  }
  return result;
 },true);
 assert(await mutation(mutable)===result&&mutationAttempts===2,'caller_mutation_isolated');

 let noRetry=0;
 const unsupported=createPartyEventClaimRetryV89(async()=>{
  noRetry++;
  throw pg('23505');
 },true);
 await rejected(()=>unsupported(valid),'private postgres driver error');
 assert(noRetry===1,'unique_violation_not_retried');

 for(const message of [
  'party_event_v87_settlement_certificate_missing_or_ambiguous',
  'party_event_v86_inventory_and_bank_full',
  'party_event_v86_eq2_issuer_not_ready',
  'chest_v70_rollback_failed',
  'chest_v69_replay_missing_physical_grants',
 ]){
  let calls=0;
  const fail=createPartyEventClaimRetryV89(async()=>{
   calls++;
   throw Error(message);
  },true);
  await rejected(()=>fail(valid),message);
  assert(calls===1,'domain_error_single_attempt_'+message);
 }

 attempts=0;
 const exhausted=createPartyEventClaimRetryV89(async()=>{
  attempts++;throw pg('40001');
 },true);
 const final=await rejected(()=>exhausted(valid),
  'private postgres driver error');
 assert((final as {code:string}).code==='40001'&&attempts===3,
  'exhaustion_preserves_original_error');

 attempts=0;
 const replay=createPartyEventClaimRetryV89(async()=>{
  attempts++;
  if(attempts===1)throw pg('40001');
  return {...result,replayed:true};
 },true);
 const paid=await replay(valid);
 assert(paid.replayed===true&&attempts===2,
  'lost_ack_or_serialization_return_committed_receipt');

 // Only the PG driver SQLSTATE field is trusted; spoofing a message
 // containing SQLSTATE must not turn a policy failure into retries.
 attempts=0;
 const fake=createPartyEventClaimRetryV89(async()=>{
  attempts++;
  throw Error('40001 database failure in untrusted message');
 },true);
 await rejected(()=>fake(valid),'40001 database failure');
 assert(attempts===1,'error_message_cannot_trigger_retry');

 attempts=0;
 const invalid=createPartyEventClaimRetryV89(async()=>{
  attempts++;return result;
 },true);
 await rejected(()=>invalid({
  authenticatedAccountId:owner,
  sourceKey:'party-event:'+week+':22222222-2222-4222-8222-222222222222:participation',
 }),'party_event_v89_invalid_authenticated_source');
 await rejected(()=>invalid({
  authenticatedAccountId:owner,sourceKey:'world-boss:arbitrary',
 }),'party_event_v89_invalid_authenticated_source');
 assert(attempts===0,'never_start_sql_for_foreign_or_wrong_family');

 // A gate change between attempts must stop the entire settlement retry.
 const savedEnv=process.env.NODE_ENV;
 let gateAttempts=0;
 const gatedRetry=createPartyEventClaimRetryV89(async()=>{
  gateAttempts++;
  process.env.NODE_ENV='production';
  throw pg('40001');
 },true);
 try{
  await rejected(()=>gatedRetry(valid),'party_event_v89_unreleased');
  assert(gateAttempts===1,'production gate rechecked before second transaction');
 }finally{
  if(savedEnv===undefined)delete process.env.NODE_ENV;
  else process.env.NODE_ENV=savedEnv;
 }
 // Preserve the actual last driver error; never manufacture a payout result.
 const terminal=pg('40P01');
 let deadlocks=0;
 const deadlockRetry=createPartyEventClaimRetryV89(async()=>{
  deadlocks++;throw terminal;
 },true);
 const deadlockError=await rejected(()=>deadlockRetry(valid),'private postgres driver error');
 assert(deadlocks===3&&deadlockError===terminal,'bounded deadlock recovery preserves error identity');

 let disabled=false;
 try{createPartyEventClaimRetryV89(async()=>result)}catch(e){
  disabled=String(e).includes('party_event_v89_unreleased');
 }
 assert(disabled,'must_opt_in_qa');
 const original=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  disabled=false;
  try{createPartyEventClaimRetryV89(async()=>result,true)}catch(e){
   disabled=String(e).includes('party_event_v89_unreleased');
  }
  assert(disabled,'production_creation_closed');
  await rejected(()=>invalid(valid),'party_event_v89_unreleased');
 }finally{if(original===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=original}
 console.log('PARTY_EVENT_V89_RETRY_OK: bounded whole-transaction 40001/40P01 replay, safe one-time payouts, no policy/identity retries');
}
run().catch(error=>{console.error(error);throw error});
