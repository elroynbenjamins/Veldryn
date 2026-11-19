import {createHash} from 'node:crypto';
import {
 WORLD_BOSS_CHEST_GATEWAY_V61_LIVE,claimWorldBossChestV61,
 type WorldBossChestPrivateStoreV61,type WorldBossChestReceiptV61,
 type WorldBossChestTransactionV61,
} from '../world-boss-chest-settlement-v61';
import {deriveServerChestRollsV1} from '../../loot/event-chest-server-roll-v1';
import type {WorldBossCanonicalChestReadV59} from '../world-boss-chest-proof-v59';
import type {WorldBossFrozenEquipmentReceiptV62} from '../world-boss-gathering-instance-v62';
function check(value:unknown,msg:string):asserts value{
 if(!value)throw Error('world_boss_v61_test:'+msg);
}
async function rejects(fn:()=>Promise<unknown>,code:string){
 let failed=false;try{await fn();}catch(e){failed=String(e).includes(code);}
 check(failed,'expected_'+code);
}
const eventId='11111111-1111-4111-8111-111111111111';
const accountId='22222222-2222-4222-8222-222222222222';
const userInput={token:'verified-auth-token',eventId,kind:'donations_goal' as const};
const firstKey='world-boss:'+eventId+':'+accountId+':donations_goal';
function sample():WorldBossCanonicalChestReadV59{
 return {
  eventId,accountId,
  event:{bossId:'sunscar',initialHp:1_000,remainingHp:300},
  warCamp:{eventId,
   trackTiers:{fortifications:1,fieldProvisions:1,siegecraft:0},
   ownDonationReceipts:[{eventId,accountId,requestId:'donation_0001',status:'committed'}],
  },
  attacks:[1,2,3].map(ordinal=>({
   eventId,accountId,ordinal,requestId:'attack_req_'+ordinal,
   status:'committed' as const,replayProof:'verified' as const,
  })),
 };
}
function findSecret(needHit:boolean):Uint8Array{
 for(let i=0;i<3000;i++){
  const secret=createHash('sha256').update('world-boss-v61-test-'+i).digest();
  const roll=deriveServerChestRollsV1({
   secret,domain:'world_boss_v58',committedChestKey:firstKey,
  }).hitRoll;
  if((roll<100)===needHit)return secret;
 }
 throw Error('world_boss_v61_test_missing_entropy_fixture');
}
const winner=findSecret(true),loser=findSecret(false);
type State={
 receipts:Map<string,WorldBossChestReceiptV61>;
 items:Map<string,WorldBossFrozenEquipmentReceiptV62>;
 inbox:Set<string>;
 gold:number;gemDust:number;temperingDust:number;essence:number;
};
function emptyState():State{
 return {receipts:new Map(),items:new Map(),inbox:new Set(),
  gold:0,gemDust:0,temperingDust:0,essence:0};
}
function clone(s:State):State{
 return {...s,receipts:new Map(s.receipts),items:new Map(s.items),
  inbox:new Set(s.inbox)};
}
class LockedFixture implements WorldBossChestPrivateStoreV61{
 state=emptyState();
 canonical=sample();
 failsAt:null|'resources'|'item'|'inbox'=null;
 corruptIssued=false;
 tier='T3' as const;
 ownedSlots=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet'] as const;
 readOwnedCalls=0;issuedCalls=0;attemptedTx=0;
 private pending=Promise.resolve();
 async withLockedAccountEvent<T>(
  event:string,account:string,work:(tx:WorldBossChestTransactionV61)=>Promise<T>,
 ):Promise<T>{
  if(event!==eventId||account!==accountId)
   throw Error('world_boss_v61_test_foreign_transaction');
  const before=this.pending;
  let release!:()=>void;
  this.pending=new Promise<void>(resolve=>{release=resolve;});
  await before;
  this.attemptedTx++;
  const s=clone(this.state);
  const newlyIssued=new Map<string,WorldBossFrozenEquipmentReceiptV62>();
  const tx:WorldBossChestTransactionV61={
   readCanonicalEvidence:async()=>this.canonical,
   readOwnedBossGatheringSlots:async()=>{
    this.readOwnedCalls++;return [...this.ownedSlots];
   },
   readTrustedEquipmentTier:async()=>this.tier,
   readReceipt:async key=>s.receipts.get(key)??null,
   issueExactGatheringItem:async req=>{
    this.issuedCalls++;
    const item:WorldBossFrozenEquipmentReceiptV62={
     ...req,instanceId:'44444444-4444-4444-8444-444444444444',
     custody:'account_bound_unclaimed_inventory',mutable:false,
     ...(this.corruptIssued?{tier:'T9' as const}:{}),
    };
    newlyIssued.set(req.sourceKey,item);
    return item;
   },
   insertReceiptOnce:async receipt=>{
    if(s.receipts.has(receipt.sourceKey))throw Error('source_unique_violation');
    s.receipts.set(receipt.sourceKey,receipt);
   },
   grantExistingResources:async (key,r)=>{
    if(!s.receipts.has(key))throw Error('source_not_committed');
    if(this.failsAt==='resources')throw Error('injected_resources_failure');
    s.gold+=r.gold;s.gemDust+=r.gemDust;
    s.temperingDust+=r.temperingDust;s.essence+=r.companionEssence;
   },
   attachIssuedEquipment:async (key,item)=>{
    if(this.failsAt==='item')throw Error('injected_item_failure');
    if(!s.receipts.has(key)||!newlyIssued.has(key)||
     [...s.items.values()].some(i=>i.instanceId===item.instanceId))
     throw Error('duplicate_or_unissued_item');
    s.items.set(key,item);
   },
   insertInboxOnce:async receipt=>{
    if(this.failsAt==='inbox')throw Error('injected_inbox_failure');
    if(s.inbox.has(receipt.sourceKey))throw Error('duplicate_inbox');
    s.inbox.add(receipt.sourceKey);
   },
  };
  try{
   const result=await work(tx);
   this.state=s;return result;
  }finally{release();}
 }
}
const auth=(store:LockedFixture,secret:Uint8Array)=>({
 authenticate:async(_:string)=>accountId,secret,store,
});
async function run(){
 check(!WORLD_BOSS_CHEST_GATEWAY_V61_LIVE,'hidden');
 const store=new LockedFixture();
 await rejects(()=>claimWorldBossChestV61(userInput,auth(store,loser)),
  'hidden_gateway_disabled');
 check(store.attemptedTx===0,'disabled_without_accessing_db');
 const initial=await claimWorldBossChestV61(userInput,auth(store,loser),true);
 check(initial.status==='committed'&&!initial.gearHit&&initial.frozenGear===null,
  'miss_still_settles_guaranteed_resources');
 check(store.state.receipts.size===1&&store.state.inbox.size===1&&
  store.state.gold===450&&store.state.essence===6&&store.state.gemDust===2&&
  store.state.temperingDust===2&&store.state.items.size===0,
  'one_account_reward_and_inbox');
 // A corrupt persisted first result must fail closed rather than display
 // invented gold, produce a new roll, or silently double-credit.
 store.state.receipts.set(firstKey,{...initial,gold:999999});
 await rejects(()=>claimWorldBossChestV61(
  userInput,auth(store,loser),true),'corrupt_existing_receipt');
 store.state.receipts.set(firstKey,initial);
 const beforeOwned=store.readOwnedCalls;
 const repeated=await claimWorldBossChestV61(userInput,auth(store,winner),true);
 check(JSON.stringify(initial)===JSON.stringify(repeated)&&
  store.state.gold===450&&store.state.inbox.size===1&&
  store.readOwnedCalls===beforeOwned&&store.issuedCalls===0,
  'key_rotation_retry_reads_frozen_result_no_second_roll');
 const concurrent=new LockedFixture();
 const [a,b]=await Promise.all([
  claimWorldBossChestV61(userInput,auth(concurrent,winner),true),
  claimWorldBossChestV61(userInput,auth(concurrent,winner),true),
 ]);
 check(JSON.stringify(a)===JSON.stringify(b)&&
  concurrent.state.receipts.size===1&&concurrent.state.inbox.size===1&&
  concurrent.state.gold===450&&concurrent.state.items.size===1&&
  concurrent.issuedCalls===1,'two_concurrent_claims_one_grant');
 if(a.frozenGear){
  const forged={...a,frozenGear:{...a.frozenGear,setId:'WB64_ROOTBOUND_HARVESTER'}};
  concurrent.state.receipts.set(firstKey,forged);
  await rejects(()=>claimWorldBossChestV61(
   userInput,auth(concurrent,winner),true),'corrupt_existing_item');
  concurrent.state.receipts.set(firstKey,a);
 }
 check(a.gearHit&&a.frozenGear?.tier==='T3'&&
  a.frozenGear?.slot==='Ring'&&a.frozenGear?.roll.skill==='mining',
  'canonical_tier_exact_missing_slot_and_boss_skill');
 for(const failAt of ['resources','item','inbox'] as const){
  const failing=new LockedFixture();
  failing.failsAt=failAt;
  await rejects(()=>claimWorldBossChestV61(
   userInput,auth(failing,winner),true),'injected_'+failAt+'_failure');
  check(failing.state.receipts.size===0&&failing.state.gold===0&&
   failing.state.items.size===0&&failing.state.inbox.size===0,
   'transaction_rollback_all_resources_and_receipts_'+failAt);
  failing.failsAt=null;
  const resolved=await claimWorldBossChestV61(
   userInput,auth(failing,winner),true);
  check(resolved.gearHit&&failing.state.items.size===1&&
   failing.state.receipts.size===1&&failing.state.inbox.size===1,
   'recovery_after_crash_'+failAt);
 }
 const forged=new LockedFixture();
 forged.corruptIssued=true;
 await rejects(()=>claimWorldBossChestV61(
  userInput,auth(forged,winner),true),'untrusted_issued_item');
 check(forged.state.items.size===0&&forged.state.receipts.size===0,
  'invalid_issuer_fails_closed_without_write');
 const unearned=new LockedFixture();
 unearned.canonical={...unearned.canonical,
  warCamp:{...unearned.canonical.warCamp,ownDonationReceipts:[]}};
 await rejects(()=>claimWorldBossChestV61(
  userInput,auth(unearned,loser),true),'not_earned');
 check(unearned.state.receipts.size===0,'no_unearned_grants');
 const foreign=new LockedFixture();
 foreign.canonical={...foreign.canonical,accountId:eventId};
 await rejects(()=>claimWorldBossChestV61(
  userInput,auth(foreign,loser),true),'cross_account_evidence');
 await rejects(()=>claimWorldBossChestV61(
  {...userInput,accountId} as typeof userInput,
  auth(new LockedFixture(),loser),true),'untrusted_request');
 console.log('WORLD_BOSS_V61_LEDGER_OK: exactly-once, concurrent, key rotation, crash rollback, no unearned/foreign grants');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
