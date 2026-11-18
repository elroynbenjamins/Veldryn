/** World Boss V56 offline account-erasure state machine regression.
 * This uses ONLY synthetic tickets, accounts, object keys and memory.
 * No Supabase connections, player deletion, object store or live rewards.
 */
import {assert} from './test-assert';
import {
 WORLD_BOSS_V56_ERASURE_LIVE,runWorldBossErasureV56,
 type WorldBossErasureDepsV56,type WorldBossErasureStageV56,
} from '../../../backend/online/world-boss-account-erasure-v56';

const OWNER='10000000-0000-4000-8000-000000000056';
const TICKET='wb56-private-privacy-service-ticket-very-long';
const KEYS=['private/replays/owner/first','private/replays/owner/second'] as const;
async function reject(fn:()=>Promise<unknown>,fragment:string){
 let text='';
 try{await fn();}catch(e){text=String(e);}
 assert.ok(text.includes(fragment),'expected '+fragment+' got '+text);
}
interface Harness{
 deps:WorldBossErasureDepsV56;
 state:{stage:WorldBossErasureStageV56;locked:boolean;fenced:boolean;
  replayDeletes:number;rowPurges:number;authDeletes:number;finalizes:number;
  permitReplayDeletion:boolean;permitAuthDelete:boolean;
  readKeyCalls:number;remaining:Set<string>};
}
function harness():Harness{
 const state={
  stage:'fenced' as WorldBossErasureStageV56,locked:false,
  fenced:true,replayDeletes:0,rowPurges:0,authDeletes:0,
  finalizes:0,permitReplayDeletion:true,permitAuthDelete:true,
  readKeyCalls:0,remaining:new Set<string>(KEYS),
 };
 const check=(account:string,lease:string)=>{
  assert.equal(account,OWNER);assert.equal(lease,'WB56_OWNER_LOCK');
  assert.equal(state.locked,true);assert.equal(state.fenced,true);
 };
 const deps:WorldBossErasureDepsV56={
  authorizeTicket:async ticket=>ticket===TICKET?{accountId:OWNER}:null,
  beginOrResume:async account=>{
   assert.equal(account,OWNER);
   if(state.locked)return {kind:'busy'};
   state.fenced=true;state.locked=true;
   return {kind:'acquired',leaseId:'WB56_OWNER_LOCK',stage:state.stage};
  },
  replayKeys:async(account,lease)=>{
   check(account,lease);
   assert.equal(state.stage,'fenced');
   state.readKeyCalls++;
   return KEYS;
  },
  deleteReplayObject:async key=>{
   assert.ok(KEYS.includes(key as (typeof KEYS)[number]));
   state.replayDeletes++;
   if(!state.permitReplayDeletion)throw Error('WB56_SYNTHETIC_STORAGE_FAILURE');
   state.remaining.delete(key);
  },
  recordReplayPurge:async(account,lease)=>{
   check(account,lease);
   assert.equal(state.stage,'fenced');
   assert.equal(state.remaining.size,0);
   state.stage='replays_purged';
  },
  purgeRowsAndVerify:async(account,lease)=>{
   check(account,lease);
   assert.equal(state.stage,'replays_purged');
   state.rowPurges++;
   state.stage='rows_purged';
  },
  deleteAuthUser:async(account,lease)=>{
   check(account,lease);
   assert.equal(state.stage,'rows_purged');
   state.authDeletes++;
   if(!state.permitAuthDelete)throw Error('WB56_SYNTHETIC_AUTH_FAILURE');
   state.stage='auth_deleted';
  },
  finalize:async(account,lease)=>{
   check(account,lease);
   assert.equal(state.stage,'auth_deleted');
   state.finalizes++;
   state.stage='complete';
  },
  releaseLease:async(account,lease)=>{
   check(account,lease);
   state.locked=false;
   assert.equal(state.fenced,true,
    'worker release may never un-fence account actions');
  },
 };
 return {state,deps};
}
async function main(){
 assert.equal(WORLD_BOSS_V56_ERASURE_LIVE,false);
 const test=harness();
 await reject(()=>runWorldBossErasureV56({ticket:'bad'},test.deps),
  'invalid_private_eraser');
 await reject(()=>runWorldBossErasureV56({ticket:TICKET+'wrong'},test.deps),
  'private_authorization_required');
 assert.equal(test.state.locked,false);

 const output=await runWorldBossErasureV56({ticket:TICKET},test.deps);
 assert.deepEqual(output,{status:'completed'});
 assert.equal(test.state.stage,'complete');
 assert.equal(test.state.locked,false);
 assert.equal(test.state.fenced,true);
 assert.equal(test.state.remaining.size,0);
 assert.equal(test.state.rowPurges,1);
 assert.equal(test.state.authDeletes,1);
 assert.equal(test.state.finalizes,1);
 assert.ok(!JSON.stringify(output).includes(OWNER));
 assert.ok(!JSON.stringify(output).includes('private/replays/'));
 // A lost-ACK duplicate returns completion without duplicating any writes.
 assert.deepEqual(await runWorldBossErasureV56({ticket:TICKET},test.deps),
  {status:'completed'});
 assert.equal(test.state.rowPurges,1);
 assert.equal(test.state.authDeletes,1);
 assert.equal(test.state.finalizes,1);

 // Object store failure must leave durable fence and original rows untouched.
 const storage=harness();storage.state.permitReplayDeletion=false;
 await reject(()=>runWorldBossErasureV56({ticket:TICKET},storage.deps),
  'WB56_SYNTHETIC_STORAGE_FAILURE');
 assert.equal(storage.state.stage,'fenced');
 assert.equal(storage.state.fenced,true);
 assert.equal(storage.state.locked,false);
 assert.equal(storage.state.rowPurges,0);
 assert.equal(storage.state.authDeletes,0);
 storage.state.permitReplayDeletion=true;
 assert.deepEqual(await runWorldBossErasureV56({ticket:TICKET},storage.deps),
  {status:'completed'});
 assert.equal(storage.state.rowPurges,1);
 assert.equal(storage.state.authDeletes,1);

 // Admin Auth fails after private rows have been removed: retry must not
 // duplicate replay/DB purge and must keep account actions fenced.
 const auth=harness();auth.state.permitAuthDelete=false;
 await reject(()=>runWorldBossErasureV56({ticket:TICKET},auth.deps),
  'WB56_SYNTHETIC_AUTH_FAILURE');
 assert.equal(auth.state.stage,'rows_purged');
 assert.equal(auth.state.fenced,true);
 assert.equal(auth.state.locked,false);
 assert.equal(auth.state.rowPurges,1);
 assert.equal(auth.state.authDeletes,1);
 auth.state.permitAuthDelete=true;
 assert.deepEqual(await runWorldBossErasureV56({ticket:TICKET},auth.deps),
  {status:'completed'});
 assert.equal(auth.state.readKeyCalls,1);
 assert.equal(auth.state.rowPurges,1);
 assert.equal(auth.state.authDeletes,2);
 assert.equal(auth.state.finalizes,1);

 // Concurrent privacy workers for one account must not acquire two
 // leases or perform duplicate DB/Auth operations. The second sees pending.
 const parallel=harness();
 let entered!:()=>void,allowContinue!:()=>void;
 const enteredPromise=new Promise<void>(resolve=>{entered=resolve;});
 const continuePromise=new Promise<void>(resolve=>{allowContinue=resolve;});
 const parallelDeps:WorldBossErasureDepsV56={
  ...parallel.deps,
  deleteReplayObject:async key=>{
   entered();
   await continuePromise;
   await parallel.deps.deleteReplayObject(key);
  },
 };
 const firstWorker=runWorldBossErasureV56({ticket:TICKET},parallelDeps);
 await enteredPromise;
 assert.deepEqual(await runWorldBossErasureV56({ticket:TICKET},parallelDeps),
  {status:'in_progress'});
 assert.equal(parallel.state.rowPurges,0);
 assert.equal(parallel.state.authDeletes,0);
 allowContinue();
 assert.deepEqual(await firstWorker,{status:'completed'});
 assert.equal(parallel.state.rowPurges,1);
 assert.equal(parallel.state.authDeletes,1);
 assert.equal(parallel.state.finalizes,1);

 // A forged or malformed privacy account identity is rejected BEFORE
 // acquiring a deletion lease or reading any personal World Boss records.
 let unauthorizedLeases=0;
 await reject(()=>runWorldBossErasureV56({ticket:TICKET},{
  ...test.deps,authorizeTicket:async()=>({accountId:'not-a-uuid'}),
  beginOrResume:async()=>{unauthorizedLeases++;return {kind:'busy'};},
 }), 'private_authorization_required');
 assert.equal(unauthorizedLeases,0);
 assert.equal(test.state.rowPurges,1,'other account data untouched');
 console.log('WORLD_BOSS_V56_PRIVATE_ERASURE_RETRY_AND_ORDER=PASS');
}
void main().catch(error=>{console.error(error);throw error;});
