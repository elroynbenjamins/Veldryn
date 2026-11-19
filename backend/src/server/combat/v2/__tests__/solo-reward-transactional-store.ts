import {strict as assert} from 'node:assert';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';
import type {SoloRewardGrantV2,SoloRewardReceiptV2} from '../solo-reward-settlement';
import {
 transactionalSoloRewardStoreV2,
 type CombatV2SqlPool,type CombatV2PinnedSqlClient,
 type CombatV2SqlQueryResult,
} from '../solo-reward-transactional-store';
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x)) as T;
const scope={
 accountId:'00000000-0000-4000-a000-000000000011',
 characterId:'00000000-0000-4000-a000-000000000022',
 encounterId:'V2_SYNTHETIC_TXN_1',
};
const grants:SoloRewardGrantV2[]=[
 {kind:'gold',resourceId:'gold',amount:5,grantSourceId:'combat-v2:solo:V2_SYNTHETIC_TXN_1:0'},
 {kind:'skill_xp',resourceId:'combat',amount:3,grantSourceId:'combat-v2:solo:V2_SYNTHETIC_TXN_1:1'},
 {kind:'companion_essence',resourceId:'essence',amount:2,grantSourceId:'combat-v2:solo:V2_SYNTHETIC_TXN_1:2'},
 {kind:'material',resourceId:'ore',amount:1,grantSourceId:'combat-v2:solo:V2_SYNTHETIC_TXN_1:3'},
];
const snapDigest='a'.repeat(64),outcomeDigest='b'.repeat(64);
const body={
 schemaVersion:1 as const,sourceKey:'combat-v2:solo:'+scope.encounterId,
 accountId:scope.accountId,characterId:scope.characterId,
 encounterId:scope.encounterId,snapshotDigest:snapDigest,
 outcomeDigest,policyId:'fixture-approved-v2',grants,
 grantDigest:enemyV2SnapshotDigest(grants),
};
const receipt:SoloRewardReceiptV2={...body,receiptDigest:enemyV2SnapshotDigest(body)};
let saved:SoloRewardReceiptV2|null=null;
let balances:SoloRewardGrantV2[]=[];
let inbox:SoloRewardReceiptV2[]=[];
let failOnGrant=false,failOnInbox=false,failOnLedger=false,failAfterCommit=false;
let lastWriterClient:CombatV2PinnedSqlClient|null=null;
let openConnections=0,commits=0,rollbacks=0,issued=0;
let chain:Promise<void>=Promise.resolve();
class FakeClient implements CombatV2PinnedSqlClient{
 private held=false;
 private unlock:(()=>void)|null=null;
 private pending:SoloRewardReceiptV2|null=null;
 private stagedGrants:SoloRewardGrantV2[]=[];
 private stagedInbox:SoloRewardReceiptV2[]=[];
 async query<Row=Record<string,unknown>>(sql:string,params:readonly unknown[]=[]):
  Promise<CombatV2SqlQueryResult<Row>>{
  const rows=(items:unknown[])=>({rows:items as Row[]});
  if(sql==='BEGIN'){
   const before=chain;
   let unlock!:()=>void;
   chain=new Promise<void>(resolve=>{unlock=resolve;});
   await before;
   this.held=true;this.unlock=unlock;return rows([]);
  }
  if(sql==='COMMIT'){
   assert.equal(this.held,true);
   if(this.pending){saved=clone(this.pending);issued++;}
   balances.push(...clone(this.stagedGrants));
   inbox.push(...clone(this.stagedInbox));
   commits++;
   this.finish();
   if(failAfterCommit){failAfterCommit=false;throw Error('synthetic_commit_ack_lost');}
   return rows([]);
  }
  if(sql==='ROLLBACK'){if(this.held){rollbacks++;this.finish();}return rows([]);}
  if(sql.includes('from private.combat_v2_solo_snapshots_v1')&&sql.includes('for update')){
   assert.equal(this.held,true);
   if(params[0]!==scope.encounterId)return rows([]);
   return rows([{account_id:scope.accountId,character_id:scope.characterId,
    snapshot_digest:snapDigest,payload:{snapshotDigest:snapDigest}}]);
  }
  if(sql.includes('from private.combat_v2_solo_reward_receipts_v1')&&
     sql.includes('for update'))return rows(saved?[{receipt:clone(saved)}]:[]);
  if(sql.includes('from private.combat_v2_solo_reward_receipts_v1 r')){
   if(params[0]!==scope.encounterId||params[1]!==scope.accountId||
    params[2]!==scope.characterId)return rows([]);
   return rows(saved?[{receipt:clone(saved)}]:[]);
  }
  if(sql==='qa_grant'){
   assert.equal(this.held,true);
   lastWriterClient=this;
   if(failOnGrant)throw Error('synthetic_grant_failure');
   this.stagedGrants.push(clone(params[0] as SoloRewardGrantV2));return rows([]);
  }
  if(sql==='qa_inbox'){
   assert.equal(this.held,true);
   lastWriterClient=this;
   if(failOnInbox)throw Error('synthetic_inbox_failure');
   this.stagedInbox.push(clone(params[0] as SoloRewardReceiptV2));return rows([]);
  }
  if(sql.startsWith('insert into private.combat_v2_solo_reward_receipts_v1')){
   assert.equal(this.held,true);
   if(failOnLedger)throw Error('synthetic_ledger_failure');
   this.pending=JSON.parse(params[9] as string) as SoloRewardReceiptV2;
   return rows([]);
  }
  throw Error('unexpected_sql_query:'+sql.slice(0,50));
 }
 private finish(){
  this.held=false;this.pending=null;this.stagedGrants=[];
  this.stagedInbox=[];const unlock=this.unlock;this.unlock=null;unlock?.();
 }
 release(){assert.equal(this.held,false,'Connection leaked open transaction');openConnections--;}
}
const pool:CombatV2SqlPool={
 async connect(){openConnections++;return new FakeClient();},
};
const writers={
 async applyGrant(tx:CombatV2PinnedSqlClient,_scope:typeof scope,grant:SoloRewardGrantV2){
  await tx.query('qa_grant',[grant]);
 },
 async appendInbox(tx:CombatV2PinnedSqlClient,_scope:typeof scope,plan:SoloRewardReceiptV2){
  await tx.query('qa_inbox',[plan]);
 },
};
const store=transactionalSoloRewardStoreV2({
 pool,writers,approvedPolicyIds:['fixture-approved-v2'],
});
const rejected=(p:Promise<unknown>,pattern:RegExp)=>assert.rejects(p,pattern);
async function run(){
 assert.throws(()=>transactionalSoloRewardStoreV2({
  pool,writers,approvedPolicyIds:[],
 }),/missing_approved_transaction_dependencies/);
 assert.equal(await store.load(scope),null);
 await rejected(store.commitOnce(scope,{...receipt,receiptDigest:'0'.repeat(64)}),/invalid_digest/);
 await rejected(store.commitOnce({...scope,accountId:'FORGED'},receipt),/invalid_receipt/);
 failOnGrant=true;
 await rejected(store.commitOnce(scope,receipt),/synthetic_grant_failure/);
 failOnGrant=false;
 assert.equal(saved,null);assert.equal(balances.length,0);assert.equal(inbox.length,0);
 failOnInbox=true;
 await rejected(store.commitOnce(scope,receipt),/synthetic_inbox_failure/);
 failOnInbox=false;
 assert.equal(saved,null);assert.equal(balances.length,0);assert.equal(inbox.length,0);
 failOnLedger=true;
 await rejected(store.commitOnce(scope,receipt),/synthetic_ledger_failure/);
 failOnLedger=false;
 assert.equal(saved,null);assert.equal(balances.length,0);assert.equal(inbox.length,0);
 failAfterCommit=true;
 await rejected(store.commitOnce(scope,receipt),/synthetic_commit_ack_lost/);
 assert.equal(issued,1);assert.equal(balances.length,4);assert.equal(inbox.length,1);
 assert.ok(lastWriterClient!==null);
 assert.deepEqual(await store.load(scope),receipt);
 const repeat=await Promise.all(Array.from({length:16},()=>store.commitOnce(scope,receipt)));
 assert.ok(repeat.every(item=>item.receiptDigest===receipt.receiptDigest));
 assert.equal(issued,1,'16 transaction retries must not double-mint rewards');
 assert.equal(balances.length,4);assert.equal(inbox.length,1);
 const rotated=transactionalSoloRewardStoreV2({
  pool,writers,approvedPolicyIds:['different-new-policy'],
 });
 assert.deepEqual(await rotated.commitOnce(scope,{...receipt,policyId:'different-new-policy',
  grantDigest:receipt.grantDigest,
  receiptDigest:enemyV2SnapshotDigest({
   ...body,policyId:'different-new-policy',
  }),
 }),receipt,'Original policy version remains immutable on retry');
 const conflicting={...receipt,outcomeDigest:'c'.repeat(64)};
 const {receiptDigest:_,...conflictBody}=conflicting;
 await rejected(store.commitOnce(scope,{
  ...conflicting,receiptDigest:enemyV2SnapshotDigest(conflictBody),
 }),/conflicting_outcome/);
 assert.equal(openConnections,0,'All connections released including failures');
 assert.ok(rollbacks>=3);
 assert.equal(issued,1);
 console.log('PASS: single pinned transaction, 3 rollback points, lost COMMIT ACK, 16 exact-once retries, policy rotation, forged receipt rejection');
}
void run().catch(error=>{console.error(error);process.exitCode=1;});
