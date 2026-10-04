import {ChatFeedCache} from '../src/core/chat-feed-cache';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function tick(){await Promise.resolve();await Promise.resolve();}

async function main(){
 let now=1000,reads=0;
 const first=deferred<string[]>(),second=deferred<string[]>();
 const feed=new ChatFeedCache(()=>{reads++;return reads===1?first.promise:second.promise;},[] as string[],()=>now);
 const loading=feed.refresh();
 const same=feed.refresh();
 ok(loading===same&&reads===1,'Dock and full chat must share one initial history request');
 // Inserts and SUBSCRIBED can arrive before the first history result. All
 // invalidations require exactly one subsequent, authoritative history read.
 void feed.refresh(true);void feed.refresh(true);void feed.refresh(true);
 ok(reads===1,'Realtime invalidations must not start concurrent reads');
 first.resolve(['older']);await tick();
 ok(Number(reads)===2,'Messages received during the initial read need one catch-up');
 second.resolve(['older','newest']);await loading;
 ok(feed.getSnapshot().value.join(',')==='older,newest','Catch-up must retain the newest accepted message');
 await feed.refresh();ok(Number(reads)===2,'Returning to fresh cached history must not refetch it');
 now+=16000;await feed.refresh();ok(Number(reads)===3,'Expired history must catch up when reopened');

 let fail=false;
 const retry=new ChatFeedCache(async()=>{if(fail)throw {message:'connection_lost'};return ['accepted'];},[] as string[]);
 await retry.refresh();fail=true;
 await retry.refresh(true);
 ok(retry.getSnapshot().value[0]==='accepted','A failed refresh must preserve visible history');
 ok(retry.getSnapshot().error==='connection_lost','Supabase error objects must produce useful text');
 fail=false;await retry.refresh(true);
 ok(retry.getSnapshot().error==='','A successful reconnect must clear the old error');

 const blockedRead=deferred<string[]>(),afterBlock=deferred<string[]>();let blockReads=0;
 const blocked=new ChatFeedCache(()=>++blockReads===1?blockedRead.promise:afterBlock.promise,['safe','blocked']);
 const blocking=blocked.refresh();
 blocked.setValue(rows=>rows.filter(row=>row!=='blocked'));
 blockedRead.resolve(['safe','blocked']);await tick();
 ok(blocked.getSnapshot().value.join(',')==='safe','A read started before blocking must not restore the blocked messages');
 afterBlock.resolve(['safe']);await blocking;
 ok(blockReads===2,'Blocking during an in-flight read requires a fresh authorized read');

 const delayed=deferred<string[]>();let calls=0;
 const oldAccount=new ChatFeedCache(()=>{calls++;return delayed.promise;},[] as string[]);
 const oldRead=oldAccount.refresh();void oldAccount.refresh(true);oldAccount.dispose();delayed.resolve(['private']);await oldRead;
 ok(oldAccount.getSnapshot().value.length===0&&calls===1,'Logout must discard delayed private messages and queued follow-ups');
 await oldAccount.refresh(true);ok(calls===1,'Disposed account feeds must never restart networking');
 console.log('PASS: shared chat reads, realtime/history race, fresh cache reuse, reconnect recovery, block races and logout isolation');
}
void main().catch(error=>{console.error(error);throw error;});
