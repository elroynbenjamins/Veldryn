import {newGame} from '../src/core/game';
import {OnlineGameRepository,type OnlineSnapshot,type PendingGameCommand,type PendingStore} from '../src/core/online-game-repository';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
async function rejects(action:()=>Promise<unknown>,message:string){let failed=false;try{await action();}catch{failed=true;}ok(failed,message);}

async function main(){
 const snapshot:OnlineSnapshot={accountId:'qa-player',state:newGame(1000),version:0,serverNow:1000};
 let pending:PendingGameCommand|null=null,keys=0,applied=0,loseResponse=true;
 const store:PendingStore={read:async()=>pending,write:async value=>{pending=value;}};
 const receipts=new Map<string,OnlineSnapshot>();
 const transport={read:async()=>snapshot,send:async(request:PendingGameCommand)=>{
  let receipt=receipts.get(request.requestId);
  if(!receipt){applied++;receipt={...snapshot,version:applied,serverNow:2000};receipts.set(request.requestId,receipt);}
  if(loseResponse){loseResponse=false;throw new Error('response_lost');}
  return receipt;
 }};
 const first=new OnlineGameRepository(snapshot.accountId,transport,store,()=>`request-${++keys}`);
 await first.load();
 await rejects(()=>first.execute({type:'claim'}),'Lost response must remain retryable');
 ok(await first.hasPending(),'Uncertain action must survive in persistent storage');
 await rejects(()=>first.execute({type:'stop'}),'A new action must not overwrite an uncertain claim');
 const restarted=new OnlineGameRepository(snapshot.accountId,transport,store,()=>`request-${++keys}`);
 await restarted.load();
 const retried=await restarted.execute();
 ok(retried.version===1&&applied===1&&keys===1&&!await restarted.hasPending(),'Restart retries the same receipt without duplicate rewards');

 let release:(value:OnlineSnapshot)=>void=()=>{},signalSent:()=>void=()=>{},sent=0;
 const requestSent=new Promise<void>(resolve=>{signalSent=resolve;});
 const slow=new OnlineGameRepository(snapshot.accountId,{read:async()=>snapshot,send:()=>{sent++;return new Promise(resolve=>{release=resolve;signalSent();});}},store,()=>`request-${++keys}`);
 await slow.load();
 const saving=slow.execute({type:'claim'});
 await rejects(()=>slow.execute({type:'claim'}),'Double tap must not create a second request');
 await requestSent;
 release({...snapshot,version:1,serverNow:2000});await saving;
 ok(sent===1&&!await slow.hasPending(),'Only one double-tapped action reaches transport');

 let sends=0;
 const diskFailure=new OnlineGameRepository(snapshot.accountId,{read:async()=>snapshot,send:async()=>{sends++;return snapshot;}},{read:async()=>null,write:async()=>{throw new Error('disk_full');}},()=> 'unsaved-request');
 await rejects(()=>diskFailure.execute({type:'claim'}),'Cannot send an action before persisting retry identity');
 ok(sends===0,'Storage failure must prevent an unrecoverable request');

 let failClear=true;
 const clearFailureStore:PendingStore={read:async()=>pending,write:async value=>{if(value===null&&failClear){failClear=false;throw new Error('disk_full');}pending=value;}};
 const clearFailure=new OnlineGameRepository(snapshot.accountId,transport,clearFailureStore,()=>`request-${++keys}`);
 await rejects(()=>clearFailure.execute({type:'claim'}),'Receipt cleanup failure must preserve the pending action');
 const beforeRetry=applied;await clearFailure.execute();
 ok(applied===beforeRetry&&!await clearFailure.hasPending(),'Retry after cleanup failure reuses the server receipt');

 const mismatch=new OnlineGameRepository(snapshot.accountId,{read:async()=>snapshot,send:async()=>({...snapshot,accountId:'other-player'})},store,()=>`request-${++keys}`);
 await mismatch.load();
 await rejects(()=>mismatch.execute({type:'claim'}),'Another account response must not replace current progress');
 ok(mismatch.snapshot?.accountId===snapshot.accountId&&await mismatch.hasPending(),'Account mismatch keeps current state and retry identity');
 console.log('PASS: restart after lost response, duplicate taps, durable retry writes, cleanup failure and account isolation (mock transport)');
}
void main().catch(error=>{console.error(error);throw error;});
