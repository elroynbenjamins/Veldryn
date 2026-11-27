import {strict as assert} from 'node:assert';
import {createCompletionLedgerReviewV2,type CompletionVictoryEvidenceV2,type CompletionLedgerReviewV2} from './regional-completion-ledger-review';
import {settleCompletionTransactionReviewV2,type CompletionTransactionStoreReviewV2,type CompletionTransactionReviewV2} from './regional-completion-transaction-review';
import type {CompletionBossIdV2} from './regional-completion-boss-review';
type Identity={accountId:string;characterId:string};
type Row={revision:number;ledger:CompletionLedgerReviewV2};
const key=(i:Identity)=>i.accountId+'|'+i.characterId;
export async function runCompletionTransactionReviewV2(){
 const a={accountId:'QA_A',characterId:'QA_A1'},b={accountId:'QA_A',characterId:'QA_A2'},foreign={accountId:'QA_B',characterId:'QA_A1'};
 const owned=new Set([key(a),key(b)]);
 let ledgers=new Map<string,Row>([a,b].map(i=>[key(i),{revision:0,ledger:createCompletionLedgerReviewV2(i)}]));
 let used=new Map<string,string>();
 const receipts=new Map<string,CompletionVictoryEvidenceV2>();
 let failCas=false,queue:Promise<unknown>=Promise.resolve();
 const store:CompletionTransactionStoreReviewV2={
  transaction<T>(work:(tx:CompletionTransactionReviewV2)=>Promise<T>):Promise<T>{
   const pending=queue.then(async()=>{
    // Isolated transactional working state, serialized lock emulator.
    const nextLedgers=new Map([...ledgers].map(([k,v])=>[k,structuredClone(v)])),nextUsed=new Map(used);
    const tx:CompletionTransactionReviewV2={
     async lockOwnedCharacter(i){return owned.has(key(i));},
     async loadLedger(i){const v=nextLedgers.get(key(i));if(!v)throw Error('missing_ledger');return v;},
     async loadTerminalVictory(id){const e=receipts.get(id);return e?structuredClone(e):undefined;},
     async reserveReceiptIdentity(id,i,boss,input,event){
      const fingerprint=JSON.stringify([i.accountId,i.characterId,boss,input,event]),prior=nextUsed.get(id);
      if(prior!==undefined)return prior===fingerprint?'same':'conflict';
      nextUsed.set(id,fingerprint);return 'inserted';
     },
     async compareAndSetLedger(i,revision,next){
      if(failCas||nextLedgers.get(key(i))?.revision!==revision)return false;
      nextLedgers.set(key(i),{revision:revision+1,ledger:structuredClone(next)});return true;
     },
    };
    const result=await work(tx);
    ledgers=nextLedgers;used=nextUsed;return result;
   });
   queue=pending.then(()=>undefined,()=>undefined);return pending;
  },
 };
 const record=(i:Identity,id:string,bossId:CompletionBossIdV2,levelAtStart:number,patch:Partial<CompletionVictoryEvidenceV2>={})=>{
  const e:CompletionVictoryEvidenceV2={...i,receiptId:id,bossId,levelAtStart,kind:'regional_completion',ruleset:'completion-v2-review',
   inputDigest:'a'.repeat(64),eventDigest:'b'.repeat(64),reason:'victory',victory:true,enemyHp:0,playerHp:20,completedAtMs:1000,...patch};
  receipts.set(id,e);return e;
 };
 record(a,'KNIGHT','FALLEN_KNIGHT',25);record(a,'SAND','BOSS_002',50);record(a,'FROST','BOSS_003',75);
 const settle=(i:Identity,id:string)=>settleCompletionTransactionReviewV2(store,i,id);
 await assert.rejects(settle(a,'SAND'),/region_locked/);
 await assert.rejects(settle(foreign,'KNIGHT'),/not_owned/);
 await assert.rejects(settle(b,'KNIGHT'),/invalid_completion_victory/);
 await assert.rejects(settle(a,'NOT_FOUND'),/receipt_not_found/);
 assert.equal(used.size,0);
 const concurrent=await Promise.all(Array.from({length:8},()=>settle(a,'KNIGHT')));
 assert.equal(concurrent.filter(x=>!x.duplicate).length,1);
 assert.ok(concurrent.every(x=>x.revision===1&&x.access.sunscar&&!x.grant&&!x.releaseEnabled));
 assert.equal(used.size,1);assert.equal(ledgers.get(key(a))?.revision,1);
 // Failed CAS must roll back receipt reservation and ledger atomically.
 failCas=true;await assert.rejects(settle(a,'SAND'),/revision_conflict/);
 assert.equal(used.has('SAND'),false);assert.equal(ledgers.get(key(a))?.revision,1);
 failCas=false;
 const sand=await settle(a,'SAND');assert.equal(sand.revision,2);assert.equal(sand.access.frostmarch,true);
 const frost=await settle(a,'FROST');assert.equal(frost.revision,3);assert.equal(frost.access.frostCompletionRecorded,true);assert.equal(frost.access.region4,false);
 // Altered receipt for same boss must fail even when milestone exists.
 const original=receipts.get('KNIGHT')!;
 receipts.set('KNIGHT',{...original,eventDigest:'c'.repeat(64)});
 await assert.rejects(settle(a,'KNIGHT'),/receipt_identity_conflict/);
 // Same global receipt identifier reused on a second owned character.
 record(b,'KNIGHT','FALLEN_KNIGHT',25);
 await assert.rejects(settle(b,'KNIGHT'),/receipt_identity_conflict/);
 receipts.set('KNIGHT',original);
 record(a,'REMATCH','FALLEN_KNIGHT',25);
 const rematch=await settle(a,'REMATCH');assert.equal(rematch.duplicate,true);assert.equal(rematch.revision,4);assert.equal(rematch.grant,false);
 const replay=await settle(a,'REMATCH');assert.equal(replay.revision,4);assert.equal(replay.duplicate,true);
 record(b,'B_KNIGHT','FALLEN_KNIGHT',25,{victory:false,reason:'wipe',playerHp:0});
 await assert.rejects(settle(b,'B_KNIGHT'),/invalid_completion_victory/);
 assert.equal(ledgers.get(key(b))?.revision,0);assert.equal(used.has('B_KNIGHT'),false);
 console.log('REGIONAL_COMPLETION_TRANSACTION_REVIEW '+JSON.stringify({concurrentClaims:8,firstCompletions:1,
  replayNoWrite:true,rematchNoGrant:true,casRollback:true,crossCharacterRejected:true,receiptCollisionRejected:true,
  alteredDigestRejected:true,orderedAccess:true,region4Enabled:false,productionPersistenceVerified:false,releaseEnabled:false}));
}
