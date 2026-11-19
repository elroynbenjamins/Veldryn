import {strict as assert} from 'node:assert';
import type {CombatResult} from '../../types';
import type {StoredSoloEncounterV2,TrustedSoloIdentityV2} from '../solo-encounter-persistence';
import {
 SoloRewardSettlementServiceV2,
 type SoloRewardReceiptV2,type SoloRewardSettlementStoreV2,
 type ApprovedSoloRewardPolicyV2,
} from '../solo-reward-settlement';
const clone=<T>(obj:T):T=>JSON.parse(JSON.stringify(obj)) as T;
const scope:TrustedSoloIdentityV2={
 accountId:'00000000-0000-4000-a000-000000000011',
 characterId:'00000000-0000-4000-a000-000000000022',
 encounterId:'QA_SOLO_REWARD_01',
};
const snapshot={
 accountId:scope.accountId,characterId:scope.characterId,
 encounterId:scope.encounterId,actorId:'P',
 snapshotDigest:'a'.repeat(64),
 combatInput:{enemies:[{id:'E'}]},
} as StoredSoloEncounterV2;
const victory={
 victory:true,reason:'victory',durationMs:200,
 events:[{atMs:0,type:'combat_start'},{atMs:200,type:'combat_end',detail:'victory'}],
 players:[{definition:{id:'P'},hp:100,alive:true}],
 enemies:[{definition:{id:'E'},hp:0,alive:false}],
} as CombatResult;
let result=clone(victory);
let quoted=0;
let simulatedWriteCount=0;
let appliedGrantCount=0;
let inboxCount=0;
let row:SoloRewardReceiptV2|null=null;
let failBeforeCommit=false;
let loseAck=false;
let wrongStoredReceipt=false;
const policy:ApprovedSoloRewardPolicyV2={
 policyId:'qa-v2-reward-policy-1',
 approved:true,maxGrantAmount:1000,
 allowedResources:{
  gold:['gold'],skill_xp:['combat'],companion_essence:['essence'],
  material:['iron_ore'],
 },
 async quote(){
  quoted++;
  return [{kind:'gold',resourceId:'gold',amount:100},
   {kind:'skill_xp',resourceId:'combat',amount:20}] as const;
 },
};
const solo={
 async load(request:TrustedSoloIdentityV2){
  if(request.accountId!==scope.accountId||request.characterId!==scope.characterId)
   throw Error('character_mismatch');
  return clone(snapshot);
 },
 async replay(){
  return clone(result);
 },
};
const store:SoloRewardSettlementStoreV2={
 async load(request){
  if(request.accountId!==scope.accountId||request.characterId!==scope.characterId)
   throw Error('character_mismatch');
  if(!row)return null;
  const copy=clone(row);
  if(wrongStoredReceipt)return {...copy,grantDigest:'f'.repeat(64)};
  return copy;
 },
 async commitOnce(request,quote){
  if(request.accountId!==scope.accountId)throw Error('character_mismatch');
  // Simulate one pinned transaction, with an atomic lock on the source key.
  // Do NOT use separate RPCs in the real implementation.
  if(row)return clone(row);
  if(failBeforeCommit){failBeforeCommit=false;throw Error('transaction_rollback');}
  row=clone(quote);
  simulatedWriteCount++;
  appliedGrantCount+=row.grants.length;
  inboxCount++;
  if(loseAck){loseAck=false;throw Error('ack_lost_after_commit');}
  return clone(row);
 },
};
const service=new SoloRewardSettlementServiceV2({solo,store,policy});
const rejects=(call:Promise<unknown>,regex:RegExp)=>assert.rejects(call,regex);
async function run(){
 await rejects(service.settle(scope),/feature_disabled/);
 await rejects(service.settle({...scope,encounterId:''},true),/invalid_scope/);
 failBeforeCommit=true;
 await rejects(service.settle(scope,true),/transaction_rollback/);
 assert.equal(row,null,'Transaction must roll back quote, balances and Inbox together');
 assert.equal(simulatedWriteCount,0);
 loseAck=true;
 await rejects(service.settle(scope,true),/ack_lost_after_commit/);
 assert.equal(simulatedWriteCount,1);
 assert.equal(appliedGrantCount,2);
 assert.equal(inboxCount,1);
 const first=await service.settle(scope,true);
 assert.equal(first.grants.length,2);
 assert.equal(simulatedWriteCount,1);
 assert.equal(appliedGrantCount,2);
 assert.equal(inboxCount,1);
 const quotesBefore=quoted;
 const repeats=await Promise.all(Array.from({length:16},()=>service.settle(scope,true)));
 assert.ok(repeats.every(item=>item.receiptDigest===first.receiptDigest));
 assert.equal(quoted,quotesBefore,'Retries must not recalculate rewards');
 assert.equal(simulatedWriteCount,1,'16 concurrent retries cannot duplicate source');
 // Existing receipts remain replayable after approved reward-policy rotation.
 const newPolicy:ApprovedSoloRewardPolicyV2={...policy,
  policyId:'qa-v2-reward-policy-2',
  async quote(){throw Error('must_not_reroll_existing_rewards');}};
 const rotated=new SoloRewardSettlementServiceV2({solo,store,policy:newPolicy});
 assert.equal((await rotated.settle(scope,true)).receiptDigest,first.receiptDigest);
 wrongStoredReceipt=true;
 await rejects(service.settle(scope,true),/invalid_persisted_receipt/);
 wrongStoredReceipt=false;
 await rejects(service.settle({...scope,accountId:'unauthorized'},true),/character_mismatch/);

 // New encounter: nonvictory cannot create a receipt or currency.
 row=null;result={...clone(victory),victory:false,reason:'wipe',
  enemies:[{...clone(victory.enemies[0]),hp:300,alive:true}],
  events:[{atMs:0,type:'combat_start'},{atMs:200,type:'combat_end',detail:'wipe'}]};
 await rejects(service.settle(scope,true),/combat_not_victorious/);
 assert.equal(row,null);
 const fakeResult={...clone(victory),enemies:[{...clone(victory.enemies[0]),hp:1,alive:true}]};
 result=fakeResult;
 await rejects(service.settle(scope,true),/false_victory/);
 result=clone(victory);
 const badPolicy=new SoloRewardSettlementServiceV2({solo,store,policy:{
  ...policy,quote:async()=>[{kind:'gold' as const,resourceId:'gold',amount:10000000}],
 }});
 await rejects(badPolicy.settle(scope,true),/invalid_policy_grant/);
 assert.equal(row,null);
 const disabledPolicy=new SoloRewardSettlementServiceV2({solo,store,policy:{
  ...policy,approved:false as true,
 }});
 await rejects(disabledPolicy.settle(scope,true),/unapproved_policy/);
 assert.equal(row,null);
 const final=await service.settle(scope,true);
 assert.equal(final.encounterId,scope.encounterId);
 assert.equal(simulatedWriteCount,2);
 assert.equal(appliedGrantCount,4);
 assert.equal(inboxCount,2);
 console.log('PASS: hidden solo rewards disabled, only real victory, 16 repeats, first receipt, policy rotation, lost ACK, rollback and receipt-forgery rejection');
}
void run().catch(error=>{console.error(error);process.exitCode=1;});
