import {
 createPartyEventRewardStoreV63,PARTY_EVENT_ATOMIC_STORE_V63_RELEASED,
 type PartySqlConnectionV63,type PartySqlPoolV63,
 type PartyEventAtomicPortsV63,
} from '../weekly-party-event-atomic-store-v63';
import {
 claimPartyEventChestV60,exchangePartyEventGearV60,
 type PartyEventRewardReceiptV60,type ServerPartyRewardAuthorityV60,
} from '../weekly-party-event-claim-v60';
import type {PrivatePartyRewardProofV61} from '../weekly-party-event-proof-v61';
import {deriveServerChestRollsV1} from '../../loot/event-chest-server-roll-v1';
import {partyEventGearForFamilyV51} from '../weekly-party-event-gear-v51';

function ensure(value:unknown,label:string):asserts value{
 if(!value)throw Error('party_event_v63_test:'+label);
}
async function reject(fn:()=>Promise<unknown>,fragment:string){
 let failed=false;try{await fn();}catch(e){failed=String(e).includes(fragment)}
 ensure(failed,'reject_'+fragment);
}
const account='11111111-1111-4111-8111-111111111111';
const party='22222222-2222-4222-8222-222222222222';
const character='33333333-3333-4333-8333-333333333333';
const receiptId='44444444-4444-4444-8444-444444444444';
const week=Date.UTC(2026,10,16);
const identity={partyId:party,accountId:account,eventStartsAtUtcMs:week};
const proof:PrivatePartyRewardProofV61={
 source:'private_party_event_settlement_join_v61',
 week:{partyId:party,eventStartsAtUtcMs:week,
  eventEndsAtUtcMs:week+604800000,settledAtUtcMs:week+604800000+3600000,
  status:'settled',family:'broken_caravan',difficulty:'standard'},
 roster:{...identity,rosterSize:2,frozenCharacterId:character},
 activity:{...identity,sourceVersion:'party_event_member_progress_v14',
  activityPoints:28},
 preparation:{...identity,committedDonationId:receiptId,
  optionalSupplyGoalReceiptId:receiptId,optionalGoalFrozen:true},
 finale:{partyId:party,eventStartsAtUtcMs:week,
  canonicalFinaleReceiptId:receiptId,serverVerifiedVictory:true},
 tier:{...identity,eligibleGearTier:2,sourceVersion:'server_level_snapshot_v2'},
};
type DatabaseState={
 receipts:Map<string,PartyEventRewardReceiptV60>;
 sigils:number;gold:number;gemDust:number;essence:number;
};
const clone=(state:DatabaseState):DatabaseState=>({
 ...state,receipts:new Map(state.receipts),
});
class MockPool implements PartySqlPoolV63{
 state:DatabaseState={receipts:new Map(),sigils:60,gold:0,gemDust:0,essence:0};
 history:string[]=[];
 released=0;
 connections=0;
 failResources=false;
 foreignRoster=false;
 invalidReceipt=false;
 invalidCollection=false;
 wrongPartyProof=false;
 private last:Promise<void>=Promise.resolve();
 async connect():Promise<PartySqlConnectionV63>{
  const previous=this.last;
  let unblock=()=>{};
  this.last=new Promise<void>(resolve=>{unblock=()=>resolve();});
  await previous;
  this.connections++;
  let copy=clone(this.state);
  let begun=false;
  let ended=false;
  const pool=this;
  return {
   async query<T extends Record<string,unknown>=Record<string,unknown>>(
    sql:string,params:readonly unknown[]=[],
   ):Promise<{rows:T[]}>{
    pool.history.push(sql);
    if(sql==='begin isolation level serializable'){
     ensure(!begun,'single_begin');
     begun=true;
     return {rows:[]};
    }
    ensure(begun&&!ended,'query_only_active_tx');
    if(sql.startsWith('set local lock_timeout'))return {rows:[]};
    if(sql==='select canonical_reward_proof'){
     ensure(params[0]===account&&params[1]===week,'proof_owner_week');
     return {rows:[{proof:pool.wrongPartyProof?{
      ...proof,week:{...proof.week,partyId:character},
     }:proof} as unknown as T]};
    }
    if(sql==='select existing_party_gear owned'){
     ensure(params[0]===account,'collection_owner');
     return {rows:[{ids:pool.invalidCollection?['FAKE_PIECE']:[]} as unknown as T]};
    }
    if(sql==='select existing_party_sigils balance'){
     ensure(params[0]===account,'wallet_read_owner');
     return {rows:[{balance:copy.sigils} as unknown as T]};
    }
    if(sql==='update existing_party_sigils wallet delta'){
     ensure(params[0]===account,'wallet_write_owner');
     const delta=params[1] as number;
     if(copy.sigils+delta<0)throw Error('insufficient_currency');
     copy.sigils+=delta;
     return {rows:[]};
    }
    if(sql==='insert into existing_resources grant'){
     ensure(params[0]===account,'resource_owner');
     if(pool.failResources)throw Error('resource_writer_fault');
     copy.gold+=params[1] as number;
     copy.gemDust+=params[2] as number;
     copy.essence+=params[3] as number;
     return {rows:[]};
    }
    if(sql.includes('for update of r,w')){
     ensure(params[0]===account&&params[1]===week,'account_week_lock_params');
     return {rows:pool.foreignRoster?[]:[{party_id:party} as unknown as T]};
    }
    if(sql.startsWith('select receipt from private.party_event_reward_receipts_v61')){
     const receipt=copy.receipts.get(params[0] as string);
     if(!receipt)return {rows:[]};
     return {rows:[{receipt:pool.invalidReceipt?
      {...receipt,partySigilsDelta:999}:receipt} as unknown as T]};
    }
    if(sql.startsWith('insert into private.party_event_reward_receipts_v61')){
     const key=params[0] as string;
     const receipt=JSON.parse(params[15] as string) as PartyEventRewardReceiptV60;
     ensure(params[3]===account&&params[2]===week,'source_bound_to_week');
     if(copy.receipts.has(key))throw Error('unique_violation');
     copy.receipts.set(key,receipt);
     return {rows:[]};
    }
    if(sql==='commit'){
     pool.state=copy;
     ended=true;
     return {rows:[]};
    }
    if(sql==='rollback'){
     ended=true;
     return {rows:[]};
    }
    throw Error('unapproved_query:'+sql);
   },
   release(){
    pool.released++;
    unblock();
   },
  };
 }
}
const pool=new MockPool();
const state=()=>pool.state;
const ports:PartyEventAtomicPortsV63={
 readCanonicalProof:async tx=>(await tx.query<{proof:PrivatePartyRewardProofV61}>(
  'select canonical_reward_proof',[account,week])).rows[0]!.proof,
 readOwnedGearPieceIds:async tx=>(await tx.query<{ids:string[]}>(
  'select existing_party_gear owned',[account])).rows[0]!.ids,
 readExistingPartySigils:async tx=>(await tx.query<{balance:number}>(
  'select existing_party_sigils balance',[account])).rows[0]!.balance,
 issueAndCommitCanonicalEventGear:async()=>{throw Error('MUST_NOT_ISSUE_EQ2');},
 applyExistingPartySigils:async(tx,owner,_key,delta)=>{
  await tx.query('update existing_party_sigils wallet delta',[owner,delta]);
 },
 grantExistingResources:async(tx,owner,_key,r)=>{
  await tx.query('insert into existing_resources grant',[
   owner,r.gold,r.gemDust,r.companionEssence]);
 },
 grantExactEquipmentCustody:async()=>{throw Error('MUST_NOT_GRANT_EQ2');},
};
function secretForMiss(){
 const chest='party-event:'+week+':'+account+':participation';
 for(let i=0;i<250;i++){
  const secret=new Uint8Array(32).fill(i);
  if(deriveServerChestRollsV1({
   domain:'party_event_v51',secret,committedChestKey:chest,
  }).hitRoll>=1200)return secret;
 }
 throw Error('no_stable_non_hit');
}
const authority:ServerPartyRewardAuthorityV60={
 source:'private_service_worker',accountId:account,eventStartsAtUtcMs:week,
 secret:secretForMiss(),
};
async function run(){
 ensure(!PARTY_EVENT_ATOMIC_STORE_V63_RELEASED,'hidden');
 const disabled=createPartyEventRewardStoreV63(pool,ports);
 await reject(()=>claimPartyEventChestV60({
  authority,kind:'participation',store:disabled,
 },true),'hidden_store_disabled');
 ensure(pool.connections===0,'disabled_did_not_checkout_db');
 const oldNodeEnv=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await reject(()=>claimPartyEventChestV60({
   authority,kind:'participation',
   store:createPartyEventRewardStoreV63(pool,ports,true),
  },true),'hidden_gateway_disabled');
 }finally{
  process.env.NODE_ENV=oldNodeEnv;
 }
 ensure(pool.connections===0,'production_never_checks_out_db');
 const store=createPartyEventRewardStoreV63(pool,ports,true);
 await reject(()=>store.withLockedAccountWeek(account,week,async tx=>{
  await tx.readVerifiedEvidence();
  await tx.applyPartySigilsDelta('party-event:'+week+':'+account+':preparation',10);
 }),'grant_without_receipt');
 await reject(()=>store.withLockedAccountWeek(account,week,async tx=>{
  await tx.readVerifiedEvidence();
  await tx.insertReceiptOnce({
   sourceKey:'party-event:'+week+':'+account+':preparation',
   accountId:account,weekStartMs:week,origin:'chest',
   chestKind:'preparation',pieceId:null,frozenGear:null,
   partySigilsDelta:10,gold:300,gemDust:3,companionEssence:5,
   rulesVersion:'party-event-reward-v60',
  });
 }),'incomplete_grant_transaction');
 ensure(state().receipts.size===0&&state().sigils===60,
  'direct_incomplete_reward_writes_rolled_back');
 pool.failResources=true;
 await reject(()=>claimPartyEventChestV60({
  authority,kind:'participation',store,
 },true),'resource_writer_fault');
 ensure(state().receipts.size===0&&state().gold===0&&
  state().sigils===60&&state().gemDust===0&&state().essence===0,
  'failure_rolls_back_receipt_wallet_and_resources');
 pool.failResources=false;
 const [first,replay]=await Promise.all([
  claimPartyEventChestV60({authority,kind:'participation',store},true),
  claimPartyEventChestV60({authority,kind:'participation',store},true),
 ]);
 ensure(first.sourceKey===replay.sourceKey&&
  first.frozenGear===null&&state().receipts.size===1&&
  state().sigils===68&&state().gold===200&&
  state().gemDust===2&&state().essence===4,
  'two_connections_one_receipt_one_reward');
 ensure(pool.history.filter(x=>x==='commit').length===2,
  'one_transaction_per_successful_attempt');
 ensure(pool.history.some(x=>x==='begin isolation level serializable')&&
  pool.history.some(x=>x.includes('for update of r,w')),
  'serializable_account_week_db_lock');
 const rotated={...authority,secret:new Uint8Array(32).fill(99)};
 const again=await claimPartyEventChestV60({
  authority:rotated,kind:'participation',store,
 },true);
 ensure(again.sourceKey===first.sourceKey&&state().receipts.size===1&&
  state().sigils===68&&state().gold===200,
  'lost_ack_entropy_rotation_safe');
 pool.invalidReceipt=true;
 await reject(()=>claimPartyEventChestV60({
  authority,kind:'participation',store,
 },true),'corrupt_canonical_receipt');
 pool.invalidReceipt=false;
 pool.wrongPartyProof=true;
 await reject(()=>claimPartyEventChestV60({
  authority,kind:'preparation',store,
 },true),'foreign_party_proof');
 pool.wrongPartyProof=false;
 pool.invalidCollection=true;
 await reject(()=>claimPartyEventChestV60({
  authority,kind:'preparation',store,
 },true),'invalid_canonical_collection');
 pool.invalidCollection=false;
 const piece=partyEventGearForFamilyV51('broken_caravan')[0]!;
 await reject(()=>exchangePartyEventGearV60({
  authority,requestedPieceId:piece.id,store,
 },true),'eq2_event_issuer_not_ready');
 ensure(state().receipts.size===1,'blocked_issuer_did_not_add_exchange_receipt');
 ensure(pool.released===pool.connections,
  'every_success_or_failure_releases_connection');
 console.log('PARTY_EVENT_ATOMIC_STORE_V63_OK: single-connection SERIALIZABLE lock, failure rollback, retry, key rotation, canonical source, no unverified EQ2 grant');
}
run().catch(e=>{console.error(e);throw e;});
