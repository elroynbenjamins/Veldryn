import {SessionPendingStore} from '../src/core/session-pending-store';
import {OnlineGameRepository,type PendingGameCommand,type OnlineSnapshot} from '../src/core/online-game-repository';
import {newGame} from '../src/core/game';

function assert(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
const deferred=<T>()=>{
 let resolve!:(value:T)=>void,reject!:(reason?:unknown)=>void;
 const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
};
async function main(){
 let durableValue:string|null='saved-before-restart',reads=0,writes=0;
 const pendingRead=deferred<string|null>();
 const cached=new SessionPendingStore<string>({
  read:()=>{reads++;return reads===1?pendingRead.promise:Promise.resolve(durableValue);},
  write:async value=>{writes++;durableValue=value;},
 });
 const first=cached.read(),second=cached.read();
 await Promise.resolve();await Promise.resolve();
 assert(reads===1,'simultaneous reads coalesce before storage resolves');
 pendingRead.resolve(durableValue);
 assert(await first==='saved-before-restart'&&await second==='saved-before-restart','previously persisted receipt loaded');
 for(let i=0;i<100;i++)assert(await cached.read()==='saved-before-restart','cached pending receipt returned');
 assert(reads===1,'repeated refreshes never read Android storage again');
 await cached.write('in-flight');
 assert(await cached.read()==='in-flight'&&durableValue==='in-flight'&&writes===1,'durable write precedes cached value');
 await cached.write(null);
 assert(await cached.read()===null&&durableValue===null,'clear is durable and cached');
 const recreated=new SessionPendingStore<string>({read:async()=>{reads++;return durableValue;},write:async value=>{durableValue=value;}});
 assert(await recreated.read()===null&&reads===2,'new account session rechecks durable storage');
 const other=new SessionPendingStore<string>({read:async()=> 'other-account-pending',write:async()=>{}});
 assert(await other.read()==='other-account-pending','different accounts cannot see session cache');

 const writing=deferred<void>();
 let writingValue:string|null=null;
 const competing=new SessionPendingStore<string>({
  read:async()=>writingValue,
  write:async value=>{await writing.promise;writingValue=value;},
 });
 assert(await competing.read()===null,'initial durable value is null');
 const writingNow=competing.write('saved');
 let hasReturned=false;
 const during=competing.read().then(value=>{hasReturned=true;return value;});
 await Promise.resolve();await Promise.resolve();
 assert(!hasReturned,'read while a write is in progress must wait');
 writing.resolve();
 await writingNow;
 assert(await during==='saved','concurrent read observes committed pending receipt');

 let fail=true,durableAfterFailure='old';
 const unreliable=new SessionPendingStore<string>({
  read:async()=>{reads++;return durableAfterFailure;},
  write:async value=>{durableAfterFailure=value??'';if(fail){fail=false;throw Error('disk-failure-after-write');}},
 });
 assert(await unreliable.read()==='old','failed-write fixture initialized');
 try{await unreliable.write('new');throw Error('expected failed write');}
 catch(error){assert((error as Error).message==='disk-failure-after-write','write failure propagates to caller');}
 assert(await unreliable.read()==='new','failed write invalidates cache and rechecks disk');
 await unreliable.write(null);
 assert(await unreliable.read()===null,'cleared failure recovers');

 const snapshot:OnlineSnapshot={accountId:'test-owner',state:newGame(1_700_000_000_000),version:1,serverNow:1_700_000_000_000};
 let persisted:PendingGameCommand|null=null,storageReads=0,storageWrites=0,transportReads=0,transportWrites=0,commandKeys=0;
 const save={
  read:async()=>{storageReads++;return persisted;},
  write:async(v:PendingGameCommand|null)=>{storageWrites++;persisted=v;},
 };
 const transport={
  read:async()=>{transportReads++;return snapshot;},
  send:async(_command:PendingGameCommand)=>{transportWrites++;return {...snapshot,version:2};},
 };
 const repository=new OnlineGameRepository('test-owner',transport,new SessionPendingStore(save),()=> 'key-'+ ++commandKeys);
 for(let i=0;i<40;i++){await repository.refresh();assert(!(await repository.hasPending()),'ordinary foreground refresh has no pending action');}
 assert(transportReads===40&&storageReads===1,'network refresh remains authoritative; storage read is once per session');
 await repository.execute({type:'settings',args:{settings:snapshot.state.settings}});
 assert(transportWrites===1&&storageWrites===2,'request receipt stored and cleared durably exactly once');
 assert(!(await repository.hasPending())&&persisted===null&&storageReads===1,'receipt cleared without extra storage read');
 const reopened=new OnlineGameRepository('test-owner',transport,new SessionPendingStore(save),()=> 'reopened-key');
 assert(!(await reopened.hasPending())&&storageReads===2,'new session never uses previous session cache');

 let retryPending:PendingGameCommand|null=null,attempts=0,ids=0;
 const retryStorage=new SessionPendingStore<PendingGameCommand>({
  read:async()=>retryPending,
  write:async value=>{retryPending=value;},
 });
 const retryRepo=new OnlineGameRepository('test-owner',{
  read:async()=>snapshot,
  send:async request=>{attempts++;if(attempts===1)throw Error('connection_lost');assert(request.requestId==='retry-1','uncertain response keeps receipt ID');return {...snapshot,version:3};},
 },retryStorage,()=> 'retry-'+ ++ids);
 await retryRepo.refresh();
 try{await retryRepo.execute({type:'settings',args:{settings:snapshot.state.settings}});}catch(error){assert((error as Error).message==='connection_lost','transport error delivered');}
 assert(await retryRepo.hasPending(),'lost acknowledgment remains durable');
 await retryRepo.execute();
 assert(!await retryRepo.hasPending()&&attempts===2&&ids===1,'retry consumes original receipt without duplicate keys');
 console.log('PASS session pending receipt cache: singleflight, 40 refreshes with one storage read, persistence, failure recovery, account isolation, stale reads and lost ACK retry');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
